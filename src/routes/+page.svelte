<script lang="ts">
    import { onMount } from "svelte";
    import { supabase } from "$lib/supabaseClient";
    import { goto } from "$app/navigation";

    let loading = true;

    onMount(async () => {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (session) {
            await goto("/map");
        } else {
            await goto("/login");
        }
        loading = false;
    });
</script>

<main>
    {#if loading}
        <div class="loading">
            <p>Loading...</p>
        </div>
    {/if}
</main>

<style>
    main {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
    }

    .loading {
        text-align: center;
        padding: 2rem;
    }
</style>
