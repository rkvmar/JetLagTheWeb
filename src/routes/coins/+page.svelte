<script lang="ts">
    import { onMount } from "svelte";
    import { supabase } from "$lib/supabaseClient";
    import BottomNav from "$lib/components/BottomNav.svelte";

    let username = "";
    let userCoins = 0;
    let coinInput = 0;
    let incrementAmount = 1;
    let error = "";

    onMount(async () => {
        username = localStorage.getItem("username") || "";
        if (username) {
            await loadUserCoins();
        }
    });

    async function loadUserCoins() {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("coins")
                .eq("username", username)
                .single();

            if (error) throw error;
            userCoins = data.coins || 0;
            coinInput = userCoins;
        } catch (e) {
            console.error("Error loading coins:", e);
            error = e.message;
        }
    }

    async function updateUserCoins(newCoins: number) {
        try {
            console.log(`Updating coins for ${username} to ${newCoins}`);
            const { error } = await supabase
                .from("profiles")
                .update({ coins: newCoins })
                .eq("username", username);

            if (error) throw error;
            userCoins = newCoins;
            coinInput = newCoins;

            // Log the activity
            await logActivity("update_coins", `Updated coins to ${newCoins}`);
        } catch (e) {
            console.error("Error updating coins:", e);
            error = e.message;
        }
    }
    async function logActivity(action: string, details: string) {
        try {
            const { error } = await supabase.from("activity_logs").insert({
                username,
                action,
                details,
            });
            if (error) throw error;
        } catch (e) {
            console.error("Error logging activity:", e);
        }
    }
    function incrementCoins() {
        updateUserCoins(userCoins + incrementAmount);
    }

    function decrementCoins() {
        if (userCoins - incrementAmount >= 0) {
            updateUserCoins(userCoins - incrementAmount);
        }
    }

    function handleCoinInputChange(event) {
        const value = parseInt(event.target.value, 10);
        if (!isNaN(value)) {
            coinInput = value;
        }
    }

    function handleCoinInputBlur() {
        updateUserCoins(coinInput);
    }

    function handleIncrementAmountChange(event) {
        const value = parseInt(event.target.value, 10);
        if (!isNaN(value)) {
            incrementAmount = value;
        }
    }
</script>

<main>
    <h1>Coins</h1>

    <div class="coins-display">
        <img
            src="/coin_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg"
            alt="Coins"
            class="coin-icon"
        />
        <span>{userCoins}</span>
    </div>

    <div class="coins-container">
        <button class="coin-button" on:click={decrementCoins}>-</button>
        <input
            type="number"
            id="incrementAmount"
            bind:value={incrementAmount}
            on:input={handleIncrementAmountChange}
        />
        <button class="coin-button" on:click={incrementCoins}>+</button>
    </div>

    {#if error}
        <div class="error-message">
            {error}
        </div>
    {/if}

    <BottomNav />
</main>

<style>
    main {
        padding: 2rem;
        padding-bottom: 80px;
        max-width: 800px;
        margin: 0 auto;
    }

    .header {
        margin-bottom: 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    h1 {
        color: #fff;
        text-align: center;
    }

    .coins-display {
        display: flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.1);
        padding: 0.5rem 1rem;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        height: 36px; /* Fixed height */
        gap: 4px; /* Use gap instead of margin */
        margin-bottom: 1rem;
    }

    .coin-icon {
        width: 24px;
        height: 24px;
        display: block; /* Remove any implicit line-height issues */
    }

    .coins-display span {
        line-height: 24px; /* Match the icon height */
        font-size: 1.1rem;
    }

    .increment-container {
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .increment-container label {
        color: #fff;
        font-weight: 500;
    }

    .coins-container {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        margin-top: 2rem;
    }

    .coin-button {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-size: 1.5rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        color: white;
        background-color: #4caf50;
    }

    .coin-button:hover {
        transform: translateY(-2px);
        filter: brightness(1.1);
    }

    .coin-button:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    input {
        width: 80px;
        padding: 0.5rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        font-size: 1.5rem;
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
        text-align: center;
        transition: all 0.3s ease;
    }

    input:focus {
        outline: none;
        border-color: #4caf50;
        background: rgba(255, 255, 255, 0.1);
    }

    .error-message {
        background-color: rgba(244, 67, 54, 0.1);
        color: #f44336;
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1rem;
        border: 1px solid rgba(244, 67, 54, 0.2);
    }
</style>
