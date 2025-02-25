<script lang="ts">
    import { supabase } from "$lib/supabaseClient";
    import { goto } from "$app/navigation";

    let username = "";
    let team = "red"; // Default team
    let loading = false;
    let error = "";

    async function handleLogin() {
        if (!username.trim()) {
            error = "Please enter a username";
            return;
        }

        loading = true;
        error = "";

        try {
            // Check if username exists
            const { data: existingProfile } = await supabase
                .from("profiles")
                .select("username")
                .eq("username", username.trim())
                .maybeSingle();

            if (!existingProfile) {
                // Create new profile if username doesn't exist
                const { error: insertError } = await supabase
                    .from("profiles")
                    .insert({ username: username.trim(), team });

                if (insertError) throw insertError;
            }

            // Store username and team in localStorage
            localStorage.setItem("username", username.trim());
            localStorage.setItem("team", team);
            await goto("/map");
        } catch (e) {
            console.error("Error:", e);
            error = e instanceof Error ? e.message : "An error occurred";
        } finally {
            loading = false;
        }
    }
</script>

<main>
    <h1>Jet Lag: The Web App</h1>

    <div class="login-container">
        <div class="input-group">
            <label for="username">Username:</label>
            <input
                type="text"
                id="username"
                bind:value={username}
                placeholder="Enter your username"
                minlength="3"
                maxlength="20"
            />
        </div>

        <div class="input-group">
            <label for="team">Select Team:</label>
            <select id="team" bind:value={team}>
                <option value="red">Red</option>
                <option value="yellow">Yellow</option>
            </select>
        </div>

        {#if error}
            <div class="error-message">
                {error}
            </div>
        {/if}

        <button on:click={handleLogin} disabled={loading || !username.trim()}>
            {loading
                ? "Logging in..."
                : `Continue as ${username.trim() || "..."}`}
        </button>
    </div>
</main>

<style>
    main {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2rem;
        min-height: calc(100vh - 4rem);
    }

    h1 {
        margin-bottom: 2rem;
        color: #fff;
        font-weight: 500;
        font-size: 2.5rem;
    }

    .login-container {
        background: rgba(255, 255, 255, 0.1);
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        width: 100%;
        max-width: 400px;
        backdrop-filter: blur(10px);
    }

    .input-group {
        margin-bottom: 1.5rem;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
        color: #fff;
        font-weight: 500;
    }

    input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        font-size: 1rem;
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
        transition: all 0.3s ease;
        box-sizing: border-box;
    }

    input:focus {
        outline: none;
        border-color: #4caf50;
        background: rgba(255, 255, 255, 0.1);
    }

    input::placeholder {
        color: rgba(255, 255, 255, 0.5);
    }

    select {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        font-size: 1rem;
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
        transition: all 0.3s ease;
        box-sizing: border-box;
    }

    select:focus {
        outline: none;
        border-color: #4caf50;
        background: rgba(255, 255, 255, 0.1);
    }

    button {
        width: 100%;
        padding: 0.75rem;
        background-color: #4caf50;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    button:hover:not(:disabled) {
        background-color: #45a049;
        transform: translateY(-1px);
    }

    button:disabled {
        background-color: rgba(255, 255, 255, 0.1);
        cursor: not-allowed;
    }

    .error-message {
        color: #ff6b6b;
        background-color: rgba(255, 107, 107, 0.1);
        padding: 0.75rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        font-size: 0.9rem;
        border: 1px solid rgba(255, 107, 107, 0.2);
    }
</style>
