"""离线模拟发布前检查，不连接 X、不发送帖子。"""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'spider' / '推特爬虫'))
import post_with_state as worker


class Clock:
    value = 0
    def now(self):
        return self.value
    def sleep(self, seconds):
        self.value += seconds


class Button:
    def __init__(self, disabled=False):
        self.disabled = disabled
    def attr(self, name):
        return 'true' if self.disabled and name == 'aria-disabled' else None


class Image:
    def __init__(self, src, ready=True, in_article=False):
        self.info = {'src': src, 'ready': ready, 'inArticle': in_article}
    def run_js(self, script):
        return self.info


class Tab:
    def __init__(self, count, busy=False, disabled=False):
        self.count, self.busy = count, busy
        self.button = Button(disabled)
    def eles(self, selector, **kwargs):
        if selector == 'css:[data-testid="attachments"] img':
            return [Image(f'blob:{i}') for i in range(self.count)]
        if 'progressbar' in selector:
            return [object()] if self.busy else []
        return []
    def ele(self, selector, **kwargs):
        return self.button


class ComposerTest(unittest.TestCase):
    def test_click_is_blocked_when_covered(self):
        button = type('Covered', (), {'run_js': lambda *args: False})()
        with patch.object(worker.time, 'sleep'), self.assertRaisesRegex(RuntimeError, '被遮挡'):
            worker.prepare_publish_click(button)

    def test_visible_click_target(self):
        button = type('Visible', (), {'run_js': lambda *args: True})()
        with patch.object(worker.time, 'sleep'):
            worker.prepare_publish_click(button)

    def test_loaded_attachment_images_only(self):
        images = [Image('blob:1'), Image('blob:1'), Image('blob:2', ready=False), Image('https:timeline', in_article=True)]
        tab = type('Images', (), {'eles': lambda *args, **kwargs: images})()
        self.assertEqual(worker.attachment_count(tab), 1)

    def run_wait(self, tab, count):
        clock = Clock()
        with patch.object(worker.time, 'monotonic', clock.now), patch.object(worker.time, 'sleep', clock.sleep):
            return worker.wait_composer_ready(tab, count, timeout=3)

    def test_multiple_images(self):
        tab = Tab(4)
        self.assertIs(self.run_wait(tab, 4), tab.button)

    def test_upload_in_progress(self):
        with self.assertRaisesRegex(RuntimeError, '发布准备超时'):
            self.run_wait(Tab(2, busy=True), 2)

    def test_missing_image(self):
        with self.assertRaisesRegex(RuntimeError, '1/2'):
            self.run_wait(Tab(1), 2)

    def test_aria_disabled(self):
        with self.assertRaises(RuntimeError):
            self.run_wait(Tab(1, disabled=True), 1)

    def test_no_images(self):
        tab = Tab(0)
        self.assertIs(self.run_wait(tab, 0), tab.button)

    def test_notice_redaction(self):
        notice = type('Notice', (), {'raw_text': 'upload failed auth_token=secret sk-example'})()
        tab = type('Notices', (), {'eles': lambda *args, **kwargs: [notice]})()
        result = worker.page_notices(tab)
        self.assertIn('upload failed', result)
        self.assertNotIn('secret', result)
        self.assertNotIn('sk-example', result)

    def verify_fixture(self, age=0):
        now = 1789455600
        status_id = str((int((now - age) * 1000) - 1288834974657) << 22)
        link = type('Link', (), {'attr': lambda self, name: '/tester/status/' + status_id})()
        text = type('Text', (), {'raw_text': 'test post'})()
        class Article:
            def ele(self, *args, **kwargs):
                return text
            def eles(self, selector, **kwargs):
                return [link] if '/status/' in selector else []
        class Profile:
            def get(self, url):
                pass
            def eles(self, *args, **kwargs):
                return [Article()]
        clock = Clock()
        with patch.object(worker.time, 'monotonic', clock.now), patch.object(worker.time, 'sleep', clock.sleep), patch.object(worker.time, 'time', lambda: now):
            return worker.verify_post_on_profile(Profile(), 'https://x.com/tester', 'test post', 0, submitted_at=now)

    def test_profile_fallback_without_toast(self):
        self.assertTrue(self.verify_fixture()['verified'])

    def test_old_identical_post_is_not_success(self):
        with self.assertRaises(RuntimeError):
            self.verify_fixture(age=3600)


if __name__ == '__main__':
    unittest.main()
