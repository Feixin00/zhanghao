import sys
import unittest
from threading import Barrier, Event
from types import SimpleNamespace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ai"))
from generate_draft import build_image_prompt, generate_image_groups


class ImagePromptLimits(unittest.TestCase):
    def test_sizes_are_sent_concurrently_and_returned_in_selection_order(self):
        barrier = Barrier(4, timeout=3)
        second_finished = Event()
        requests = []
        def generate(**options):
            requests.append(options)
            barrier.wait()  # A sequential implementation would time out here.
            if options["size"] == "2048x1152":
                self.assertTrue(second_finished.wait(3))
            else:
                second_finished.set()
            return SimpleNamespace(data=[options["size"]] * options["n"])
        client = SimpleNamespace(images=SimpleNamespace(generate=generate))
        completed = []
        groups = list(generate_image_groups(client, "chosen-model", "prompt", ["2048x1152", "2160x3840"], 2, lambda done, total: completed.append((done, total))))
        self.assertEqual(groups, [("2048x1152", ["2048x1152"] * 2), ("2160x3840", ["2160x3840"] * 2)])
        self.assertEqual(len(requests), 4)
        self.assertEqual(completed, [(1, 4), (2, 4), (3, 4), (4, 4)])
        self.assertTrue(all(item["model"] == "chosen-model" and item["n"] == 1 for item in requests))

    def test_parallel_group_errors_are_not_silently_ignored(self):
        def generate(**options):
            return SimpleNamespace(data=[])
        client = SimpleNamespace(images=SimpleNamespace(generate=generate))
        with self.assertRaises(ValueError):
            list(generate_image_groups(client, "model", "prompt", ["auto"], 2))

    def test_short_prompt_keeps_materials(self):
        prompt = build_image_prompt({"text": "原始资料"}, {"title": "标题", "body": "正文"}, "蓝色背景")
        self.assertLessEqual(len(prompt), 1000)
        for value in ("原始资料", "标题", "正文", "蓝色背景"):
            self.assertIn(value, prompt)

    def test_long_prompt_reserves_each_section(self):
        prompt = build_image_prompt({"text": "原" * 8000}, {"title": "题" * 3000, "body": "文" * 9000}, "改" * 4000)
        self.assertLessEqual(len(prompt), 1000)
        for value in ("原" * 300, "题" * 100, "文" * 350, "改" * 150):
            self.assertIn(value, prompt)

    def test_unicode_characters(self):
        prompt = build_image_prompt({"text": "🌸" * 2000}, {"title": "图", "body": "文"}, "")
        self.assertLessEqual(len(prompt), 1000)
        self.assertIn("🌸", prompt)


if __name__ == "__main__":
    unittest.main()
