
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

// ============================================
// CONFIGURATION
// ============================================

const ALLOWED_ROLES = [
  "mechanic",
  "group_leader",
  "planner",
  "supervisor",
  "superintendent",
  "engineer",
  "admin",
  "SM",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

// Ambil key baru dengan fallback ke legacy key
function getDefaultKey(
  dictionaryEnv: string,
  legacyEnv: string
): string | null {
  const dictionary = Deno.env.get(dictionaryEnv);

  if (dictionary) {
    try {
      const parsed = JSON.parse(dictionary);

      if (
        parsed &&
        typeof parsed.default === "string"
      ) {
        return parsed.default;
      }
    } catch {
      console.error(`Invalid configuration: ${dictionaryEnv}`);
    }
  }

  return Deno.env.get(legacyEnv) || null;
}

// ============================================
// MAIN EDGE FUNCTION
// ============================================

export default {
  async fetch(req: Request): Promise<Response> {

    // 1. Handle CORS
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return jsonResponse(
        {
          success: false,
          error: "Method not allowed.",
        },
        405
      );
    }

    try {

      // ========================================
      // 2. SUPABASE CONFIGURATION
      // ========================================

      const supabaseUrl = Deno.env.get("SUPABASE_URL");

      const publishableKey = getDefaultKey(
        "SUPABASE_PUBLISHABLE_KEYS",
        "SUPABASE_ANON_KEY"
      );

      const secretKey = getDefaultKey(
        "SUPABASE_SECRET_KEYS",
        "SUPABASE_SERVICE_ROLE_KEY"
      );

      if (!supabaseUrl || !publishableKey || !secretKey) {
        console.error("Supabase environment configuration incomplete.");

        return jsonResponse(
          {
            success: false,
            error: "Konfigurasi backend Supabase belum lengkap.",
          },
          500
        );
      }

      // ========================================
      // 3. GET ADMIN ACCESS TOKEN
      // ========================================

      const authHeader = req.headers.get("Authorization");

      if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
        return jsonResponse(
          {
            success: false,
            error: "Session tidak ditemukan. Silakan login kembali.",
          },
          401
        );
      }

      const accessToken = authHeader
        .replace(/^Bearer\s+/i, "")
        .trim();

      if (!accessToken) {
        return jsonResponse(
          {
            success: false,
            error: "Access token kosong.",
          },
          401
        );
      }

      // ========================================
      // 4. VERIFY USER THROUGH SUPABASE AUTH
      // ========================================

      // auth.getUser(token) memverifikasi token
      // melalui Auth server, termasuk JWT HS256.

      const authClient = createClient(
        supabaseUrl,
        publishableKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        }
      );

      const {
        data: authData,
        error: authVerifyError,
      } = await authClient.auth.getUser(accessToken);

      if (authVerifyError || !authData.user) {
        console.error(
          "USER TOKEN VERIFICATION ERROR:",
          authVerifyError?.message
        );

        return jsonResponse(
          {
            success: false,
            error: "Session tidak valid atau sudah kedaluwarsa.",
          },
          401
        );
      }

      const callerId = authData.user.id;

      // ========================================
      // 5. INITIALIZE ADMIN CLIENT
      // ========================================

      const adminClient = createClient(
        supabaseUrl,
        secretKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        }
      );

      // ========================================
      // 6. VERIFY ADMIN ROLE
      // ========================================

      const {
        data: adminProfile,
        error: adminError,
      } = await adminClient
        .from("users")
        .select("id, role")
        .eq("id", callerId)
        .maybeSingle();

      if (adminError) {
        console.error("ADMIN CHECK ERROR:", adminError);

        return jsonResponse(
          {
            success: false,
            error: "Gagal memeriksa hak akses Admin.",
          },
          500
        );
      }

      if (
        String(adminProfile?.role || "")
          .trim()
          .toLowerCase() !== "admin"
      ) {
        console.warn("REGISTRATION ACCESS DENIED:", {
          userId: callerId,
          role: adminProfile?.role,
        });

        return jsonResponse(
          {
            success: false,
            error: "Akses ditolak. Hanya Admin yang dapat mendaftarkan pengguna.",
          },
          403
        );
      }

      // ========================================
      // 7. READ REGISTRATION FORM
      // ========================================

      const body = await req.json().catch(() => null);

      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
      ) {
        return jsonResponse(
          {
            success: false,
            error: "Format data tidak valid.",
          },
          400
        );
      }

      const email =
        typeof body.email === "string"
          ? body.email.trim().toLowerCase()
          : "";

      const password =
        typeof body.password === "string"
          ? body.password
          : "";

      const name =
        typeof body.name === "string"
          ? body.name.trim()
          : "";

      const nrp =
        typeof body.nrp === "string"
          ? body.nrp.trim()
          : "";

      const username =
        typeof body.username === "string"
          ? body.username.trim()
          : "";

      const role =
        typeof body.role === "string"
          ? body.role.trim()
          : "";

      // ========================================
      // 8. VALIDATE INPUT
      // ========================================

      if (!email || !password || !name || !role) {
        return jsonResponse(
          {
            success: false,
            error: "Nama, Email, Password dan Role wajib diisi.",
          },
          400
        );
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonResponse(
          {
            success: false,
            error: "Format email tidak valid.",
          },
          400
        );
      }

      if (!ALLOWED_ROLES.includes(role)) {
        return jsonResponse(
          {
            success: false,
            error: "Role pengguna tidak valid.",
          },
          400
        );
      }

      // ========================================
      // 9. CREATE AUTH USER
      // ========================================

      const {
        data: newAuthData,
        error: createAuthError,
      } = await adminClient.auth.admin.createUser({
        email,
        password,

        // Admin dianggap telah memverifikasi email
        email_confirm: true,

        user_metadata: {
          name,
          full_name: name,
          nrp,
          username,
        },
      });

      if (createAuthError || !newAuthData.user) {
        console.error(
          "AUTH USER CREATION ERROR:",
          createAuthError?.message
        );

        return jsonResponse(
          {
            success: false,
            error:
              createAuthError?.message ||
              "Gagal membuat akun Authentication.",
          },
          400
        );
      }

      const newUserId = newAuthData.user.id;

      console.log("AUTH USER CREATED:", {
        id: newUserId,
        email,
      });

      // ========================================
      // 10. CREATE PROFILE IN PUBLIC.USERS
      // ========================================

      const userPayload = {
        id: newUserId,
        email,
        name,
        nrp: nrp || null,
        username: username || null,
        role,
      };

      const {
        error: profileError,
      } = await adminClient
        .from("users")
        .insert(userPayload);

      // ========================================
      // 11. ROLLBACK IF PROFILE INSERT FAILS
      // ========================================

      if (profileError) {
        console.error(
          "PUBLIC USERS INSERT ERROR:",
          profileError
        );

        // Hapus kemungkinan profil yang sudah dibuat
        const { error: cleanupProfileError } =
          await adminClient
            .from("users")
            .delete()
            .eq("id", newUserId);

        // Hapus akun Auth
        const { error: cleanupAuthError } =
          await adminClient.auth.admin.deleteUser(
            newUserId
          );

        console.error("REGISTRATION ROLLBACK:", {
          profile: cleanupProfileError?.message || "SUCCESS",
          auth: cleanupAuthError?.message || "SUCCESS",
        });

        return jsonResponse(
          {
            success: false,
            error: `Gagal menyimpan profil: ${profileError.message}`,
            rollback: {
              profile: cleanupProfileError ? "FAILED" : "SUCCESS",
              auth: cleanupAuthError ? "FAILED" : "SUCCESS",
            },
          },
          500
        );
      }

      // ========================================
      // 12. SUCCESS
      // ========================================

      console.log("REGISTRATION SUCCESS:", {
        id: newUserId,
        email,
        role,
        createdBy: callerId,
      });

      return jsonResponse(
        {
          success: true,
          message: "Pengguna berhasil didaftarkan.",
          userId: newUserId,
          email,
          name,
          role,
        },
        201
      );

    } catch (error) {

      console.error("REGISTER USER ERROR:", error);

      return jsonResponse(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan internal.",
        },
        500
      );
    }
  },
};
