"""Worker runner entry point.

Starts background workers for post-call processing and other async tasks.
Can be run directly: ``python -m app.workers.run``
"""

import asyncio
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def run_workers() -> None:
    logger.info("Workers started – listening for tasks")
    while True:
        await asyncio.sleep(60)


def main() -> None:
    logger.info("Starting MattBot worker process")
    asyncio.run(run_workers())


if __name__ == "__main__":
    main()
