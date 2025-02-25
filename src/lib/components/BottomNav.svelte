<script lang="ts">
    import { page } from "$app/stores";
</script>

<nav class="bottom-nav">
    <a
        href="/cards"
        class="nav-item"
        class:active={$page.url.pathname === "/cards"}
    >
        <img
            src="/cards_star_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Cards"
        />
        <span>Cards</span>
    </a>
    <a
        href="/map"
        class="nav-item"
        class:active={$page.url.pathname === "/map"}
    >
        <img src="/map_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg" alt="Map" />
        <span>Map</span>
    </a>
    <a
        href="/coins"
        class="nav-item"
        class:active={$page.url.pathname === "/coins"}
    >
        <img
            src="/coin_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Coins"
        />
        <span>Coins</span>
    </a>
</nav>

<style>
    .bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 60px;
        background: rgb(37, 46, 63);
        backdrop-filter: blur(10px);
        display: flex;
        justify-content: space-around;
        align-items: center;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 1000;
    }

    .nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: #e3e3e3;
        text-decoration: none;
        padding: 8px;
        transition: all 0.2s ease;
        opacity: 0.7;
    }

    .nav-item.active {
        opacity: 1;
    }

    .nav-item span {
        font-size: 12px;
        margin-top: 4px;
    }

    .nav-item img {
        width: 24px;
        height: 24px;
    }
</style>
