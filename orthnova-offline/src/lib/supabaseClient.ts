// Mock Supabase client for offline use
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL as string;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string;

// Mock client that mimics Supabase interface but uses localStorage
export const supabase = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      // In offline mode, we'll use a simple authentication mechanism
      return new Promise((resolve) => {
        setTimeout(() => {
          // For demo purposes, we'll accept any credentials
          // In a real app, you'd check against stored users
          resolve({
            data: { 
              user: { 
                id: 'user1', 
                email,
                user_metadata: { role: email === 'admin@clinic.com' ? 'admin' : 'user' }
              },
              session: { access_token: 'mock-token' }
            },
            error: null
          });
        }, 500);
      });
    },
    signOut: async () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ error: null });
        }, 300);
      });
    }
  },
  
  from: (table: string) => {
    // This is a simplified mock - in a real implementation, you would map
    // table names to localStorage arrays and implement proper querying
    return {
      select: () => ({
        eq: () => ({ data: [], error: null }),
        ilike: () => ({ data: [], error: null }),
        gte: () => ({ lte: () => ({ data: [], error: null }) }),
        order: () => ({ data: [], error: null }),
        maybeSingle: () => ({ data: null, error: null }),
        single: () => ({ data: {}, error: null })
      }),
      insert: () => ({ 
        select: () => ({ single: () => ({ data: {}, error: null }) })
      }),
      update: () => ({ 
        eq: () => ({ 
          select: () => ({ single: () => ({ data: {}, error: null }) })
        })
      }),
      delete: () => ({ eq: () => ({ data: [], error: null }) })
    };
  },
  
  rpc: (functionName: string, params: any) => {
    // Mock RPC functions
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data: [], error: null });
      }, 300);
    });
  }
};

console.warn('Running in offline mode with mocked Supabase client.');