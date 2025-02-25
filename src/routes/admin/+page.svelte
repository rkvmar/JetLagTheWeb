<script lang="ts">
    import { onMount } from "svelte";
    import { supabase } from "$lib/supabaseClient";

    let logs = [];
    let loading = true;
    let error = "";

    onMount(async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from("activity_logs")
                .select("*")
                .order("timestamp", { ascending: false });

            if (fetchError) throw fetchError;
            logs = data;
        } catch (e) {
            console.error("Error fetching logs:", e);
            error = e.message;
        } finally {
            loading = false;
        }
    });
</script>

<main>
    <h1>Admin Logs</h1>

    {#if loading}
        <p>Loading...</p>
    {:else if error}
        <p class="error">{error}</p>
    {:else}
        <table>
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Username</th>
                    <th>Action</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
                {#each logs as log}
                    <tr>
                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                        <td>{log.username}</td>
                        <td>{log.action}</td>
                        <td>{log.details}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</main>

<style>
    main {
        padding: 2rem;
        max-width: 800px;
        margin: 0 auto;
    }

    h1 {
        color: #fff;
        text-align: center;
        margin-bottom: 2rem;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 2rem;
    }

    th,
    td {
        padding: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        text-align: left;
    }

    th {
        background-color: rgba(255, 255, 255, 0.1);
        color: #fff;
    }

    td {
        background-color: rgba(255, 255, 255, 0.05);
        color: #fff;
    }

    .error {
        color: #ff6b6b;
        background-color: rgba(255, 107, 107, 0.1);
        padding: 0.75rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        font-size: 0.9rem;
        border: 1px solid rgba(255, 107, 107, 0.2);
    }
</style>
