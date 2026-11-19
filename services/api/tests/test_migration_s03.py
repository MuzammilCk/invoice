"""Test Alembic migrations up to 0002."""

from pathlib import Path

from alembic.config import Config

from alembic import command


def test_alembic_migrations(tmp_path: Path):
    db_file = tmp_path / "test_migration.db"
    db_url = f"sqlite:///{db_file}"

    ini_path = Path(__file__).parent.parent / "alembic.ini"
    alembic_cfg = Config(str(ini_path))
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)
    alembic_cfg.set_main_option("script_location", str(Path(__file__).parent.parent / "alembic"))

    # Upgrade to head
    command.upgrade(alembic_cfg, "head")

    # Downgrade to 0001
    command.downgrade(alembic_cfg, "0001")

    # Upgrade back to head
    command.upgrade(alembic_cfg, "head")
