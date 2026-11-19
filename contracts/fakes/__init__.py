"""__init__.py for contracts/fakes package."""

from contracts.fakes.perception import FakePerceptionKernel
from contracts.fakes.renderer import FakeRenderer

__all__ = [
    "FakePerceptionKernel",
    "FakeRenderer",
]
