<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";

    let isLoading = true;

    onMount(() => {
        const username = localStorage.getItem("username");
        if (!username && window.location.pathname !== "/login") {
            goto("/login");
        }
        isLoading = false;
    });
</script>

{#if isLoading}
    <div class="loading">Loading...</div>
{:else}
    <slot />
{/if}

<style>
    :global(body) {
        background-color: #252e3f;
        font-family: "Roboto", sans-serif;
        color: #fff;
    }

    .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        font-size: 1.2rem;
        color: #fff;
    }
</style>
