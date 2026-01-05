from supabase import create_client, Client
from core.config import settings

class SupabaseDB:
    client: Client = None

    @classmethod
    def get_client(cls) -> Client:
        if cls.client is None:
            if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
                print("Warning: Supabase credentials not set. Database features will fail.")
                return None
            try:
                cls.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            except Exception as e:
                print(f"Error connecting to Supabase: {e}")
                return None
        return cls.client

supabase = SupabaseDB.get_client
