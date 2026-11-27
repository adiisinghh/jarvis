"""Learning primitive -- router policies, reward functions, learning."""

from __future__ import annotations

from jarvis.learning._stubs import (
    QueryAnalyzer,
    RewardFunction,
    RouterPolicy,
    RoutingContext,
)
from jarvis.learning.agents.agent_evolver import AgentConfigEvolver
from jarvis.learning.learning_orchestrator import LearningOrchestrator
from jarvis.learning.optimize.llm_optimizer import LLMOptimizer
from jarvis.learning.optimize.optimizer import OptimizationEngine
from jarvis.learning.optimize.store import OptimizationStore
from jarvis.learning.routing.complexity import (
    ComplexityQueryAnalyzer,
    score_complexity,
)
from jarvis.learning.routing.heuristic_reward import HeuristicRewardFunction
from jarvis.learning.routing.router import (
    HeuristicRouter,
    build_routing_context,
)
from jarvis.learning.training.data import TrainingDataMiner
from jarvis.learning.training.lora import HAS_TORCH, LoRATrainer, LoRATrainingConfig


def ensure_registered() -> None:
    """Ensure all learning policies are registered in RouterPolicyRegistry."""
    from jarvis.learning.routing.heuristic_policy import (
        ensure_registered as _reg_heuristic,
    )

    _reg_heuristic()

    from jarvis.learning.routing.learned_router import (
        ensure_registered as _reg_learned,
    )

    _reg_learned()

    # Intelligence training (optional deps)
    try:
        import jarvis.learning.intelligence  # noqa: F401
    except ImportError:
        pass

    # Orchestrator-specific training (optional deps)
    try:
        import jarvis.learning.intelligence.orchestrator  # noqa: F401
    except ImportError:
        pass

    # Agent optimizers (optional deps)
    try:
        import jarvis.learning.agents.dspy_optimizer  # noqa: F401
    except ImportError:
        pass
    try:
        import jarvis.learning.agents.gepa_optimizer  # noqa: F401
    except ImportError:
        pass
    try:
        import jarvis.learning.agents.ace_optimizer  # noqa: F401
    except ImportError:
        pass


__all__ = [
    "AgentConfigEvolver",
    "ComplexityQueryAnalyzer",
    "HAS_TORCH",
    "HeuristicRewardFunction",
    "HeuristicRouter",
    "LLMOptimizer",
    "LearningOrchestrator",
    "LoRATrainer",
    "LoRATrainingConfig",
    "OptimizationEngine",
    "OptimizationStore",
    "QueryAnalyzer",
    "RewardFunction",
    "RouterPolicy",
    "RoutingContext",
    "TrainingDataMiner",
    "build_routing_context",
    "ensure_registered",
    "score_complexity",
]
