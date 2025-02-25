<script lang="ts">
    import { onMount } from "svelte";
    import { supabase } from "$lib/supabaseClient";
    import { goto } from "$app/navigation";
    import BottomNav from "$lib/components/BottomNav.svelte";

    let loading = {
        challenge: false,
        item: false,
        tower: false,
    };
    let activeCards: Record<string, any[]> = {
        challenge: [],
        item: [],
        tower: [],
    };
    let error = "";
    let username = "";
    let userCoins = 0;

    onMount(async () => {
        username = localStorage.getItem("username") || "";
        if (username) {
            await loadActiveCards();
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
        } catch (e) {
            console.error("Error loading coins:", e);
        }
    }
    async function loadActiveCards() {
        try {
            const { data, error: queryError } = await supabase
                .from("player_cards")
                .select(
                    `
                        id,
                        card_type,
                        challenge_card_id,
                        item_card_id,
                        tower_card_id
                    `,
                )
                .eq("username", username);

            if (queryError) throw queryError;

            if (data) {
                // Reset arrays
                activeCards = {
                    challenge: [],
                    item: [],
                    tower: [],
                };

                for (const entry of data) {
                    const cardId = entry[`${entry.card_type}_card_id`];
                    if (cardId) {
                        const { data: cardData, error: cardError } =
                            await supabase
                                .from(`${entry.card_type}_cards`)
                                .select("*")
                                .eq("id", cardId)
                                .single();

                        if (!cardError && cardData) {
                            activeCards[entry.card_type].push({
                                ...cardData,
                                player_card_id: entry.id,
                                type: entry.card_type,
                            });
                        }
                    }
                }
                // Force reactivity update
                activeCards = { ...activeCards };
            }
        } catch (e) {
            console.error("Error loading active cards:", e);
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
    async function drawCard(type: "challenge" | "item" | "tower") {
        loading[type] = true;
        error = "";

        try {
            const username = localStorage.getItem("username");
            if (!username) {
                throw new Error("Not logged in");
            }

            const { data, error: queryError } = await supabase
                .from(`${type}_cards`)
                .select("*");

            if (queryError) throw queryError;

            if (data && data.length > 0) {
                const randomIndex = Math.floor(Math.random() * data.length);
                const drawnCard = data[randomIndex];

                const { data: playerCard, error: insertError } = await supabase
                    .from("player_cards")
                    .insert({
                        username: username,
                        card_type: type,
                        [`${type}_card_id`]: drawnCard.id,
                    })
                    .select("id")
                    .single();

                if (insertError) throw insertError;

                activeCards[type].push({
                    ...drawnCard,
                    player_card_id: playerCard.id,
                    type,
                });
                // Force reactivity update
                activeCards = { ...activeCards };

                // Log the activity
                await logActivity(
                    "draw_card",
                    `Drew a ${type} card: ${drawnCard.name || drawnCard.title}`,
                );
            } else {
                throw new Error(`No ${type} cards available`);
            }
        } catch (e) {
            console.error(`Error drawing ${type} card:`, e);
            error = e.message;
        } finally {
            loading[type] = false;
        }
    }

    async function completeCard(
        type: "challenge" | "item" | "tower",
        cardIndex: number,
        isVeto: boolean = false,
    ) {
        try {
            const card = activeCards[type][cardIndex];
            if (!card) return;

            if (type === "challenge" && card.coins && !isVeto) {
                // Only award coins if it's not a veto
                const { error: updateError } = await supabase.rpc(
                    "update_user_coins",
                    {
                        username_param: username,
                        coins_to_add: card.coins,
                    },
                );

                if (updateError) throw updateError;
                userCoins += card.coins;
            }

            const { error: deleteError } = await supabase
                .from("player_cards")
                .delete()
                .eq("id", card.player_card_id);

            if (deleteError) throw deleteError;

            // Remove the card from the array
            activeCards[type].splice(cardIndex, 1);
            // Force reactivity update
            activeCards = { ...activeCards };

            // Log the activity
            await logActivity(
                "complete_card",
                `Completed a ${type} card: ${card.name || card.title}`,
            );
        } catch (e) {
            console.error("Error completing card:", e);
            error = e.message;
        }
    }

    async function placeTower(type: "tower", cardIndex: number) {
        try {
            const card = activeCards[type][cardIndex];
            if (!card) return;

            const radius = parseFloat(card.radius) || 100; // Default to 100 if not set

            // Navigate to map with tower data
            await goto(
                `/map?placeTower=${encodeURIComponent(
                    JSON.stringify({
                        id: card.player_card_id,
                        name: card.name,
                        description: card.description,
                        radius: radius, // Use the parsed radius
                    }),
                )}`,
            );

            // Log the activity
            await logActivity(
                "place_tower",
                `Initiated tower placement: ${card.name}`,
            );
        } catch (e) {
            console.error("Error initiating tower placement:", e);
            error = e.message;
        }
    }
</script>

<main>
    <div class="header">
        <h1>Cards</h1>
        <div class="coins-display">
            <img
                src="/coin_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Coins"
                class="coin-icon"
            />
            <span>{userCoins}</span>
        </div>
    </div>

    <div class="buttons-container">
        <button
            class="card-button challenge"
            on:click={() => drawCard("challenge")}
            disabled={loading.challenge}
        >
            {loading.challenge ? "Drawing..." : "Draw Challenge"}
        </button>

        <button
            class="card-button item"
            on:click={() => drawCard("item")}
            disabled={loading.item}
        >
            {loading.item ? "Drawing..." : "Draw Item"}
        </button>

        <button
            class="card-button tower"
            on:click={() => drawCard("tower")}
            disabled={loading.tower}
        >
            {loading.tower ? "Drawing..." : "Draw Tower"}
        </button>
    </div>

    {#if error}
        <div class="error-message">
            {error}
        </div>
    {/if}

    <div class="active-cards">
        {#each Object.entries(activeCards) as [type, cards]}
            {#each cards as card, index}
                <div class="card-display {type}">
                    <div class="card-content">
                        <h2>{card.title || card.name}</h2>
                        <p>{card.description}</p>
                        {#if type === "challenge" && card.coins !== undefined}
                            <div class="coins">
                                <img
                                    src="/coin_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg"
                                    alt="Coins"
                                    class="coin-icon"
                                />
                                <span>{card.coins}</span>
                            </div>
                        {/if}
                        {#if type === "tower"}
                            <div class="radius-info">
                                <span>Radius: {card.radius} miles</span>
                            </div>
                        {/if}
                    </div>
                    <div class="button-group">
                        {#if type === "challenge"}
                            <button
                                class="complete-button {type}"
                                on:click={() =>
                                    completeCard(type, index, false)}
                            >
                                Complete
                            </button>
                            <button
                                class="veto-button"
                                on:click={() => completeCard(type, index, true)}
                            >
                                Veto
                            </button>
                        {:else if type === "tower"}
                            <button
                                class="complete-button {type}"
                                on:click={() => placeTower(type, index)}
                            >
                                Place
                            </button>
                        {:else}
                            <button
                                class="complete-button {type}"
                                on:click={() => completeCard(type, index)}
                            >
                                Use
                            </button>
                        {/if}
                    </div>
                </div>
            {/each}
        {/each}
    </div>

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
    }

    h1 {
        color: #fff;
        text-align: center;
    }

    .buttons-container {
        display: grid;
        gap: 1rem;
        margin-bottom: 2rem;
    }

    .card-button {
        padding: 1rem;
        border: none;
        border-radius: 8px;
        font-size: 1.1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        color: white;
    }

    .card-button.challenge {
        background-color: #ff9800;
    }

    .card-button.item {
        background-color: #2196f3;
    }

    .card-button.tower {
        background-color: #4caf50;
    }

    .card-button:hover:not(:disabled) {
        transform: translateY(-2px);
        filter: brightness(1.1);
    }

    .card-button:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .card-display {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255, 255, 255, 0.1);
        padding: 1.5rem 2rem;
        border-radius: 12px;
        margin-top: 1rem;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
    }

    .card-display.challenge {
        border-left: 4px solid #ff9800;
    }

    .card-display.item {
        border-left: 4px solid #2196f3;
    }

    .card-display.tower {
        border-left: 4px solid #4caf50;
    }

    .card-display h2 {
        margin: 0 0 1rem 0;
        color: #fff;
    }

    .card-display p {
        margin: 0 0 1rem 0;
        color: rgba(255, 255, 255, 0.9);
        line-height: 1.5;
    }

    .points {
        font-weight: 500;
        color: #4caf50;
        font-size: 1.1rem;
    }
    .card-display {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255, 255, 255, 0.1);
        padding: 1.5rem 2rem;
        border-radius: 12px;
        margin-top: 1rem;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
    }

    .card-content {
        flex: 1;
        margin-right: 1rem; /* Reduced from 2rem to give more space for buttons */
    }

    .complete-button {
        min-width: 120px;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        color: white;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .complete-button.challenge {
        background-color: #ff9800;
    }

    .complete-button.item {
        background-color: #2196f3;
    }

    .complete-button.tower {
        background-color: #4caf50;
    }

    .complete-button:hover {
        transform: translateY(-2px);
        filter: brightness(1.1);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .complete-button:active {
        transform: translateY(0);
    }

    /* Update the card borders to be more visible */
    .card-display.challenge {
        border-left: 6px solid #ff9800;
    }

    .card-display.item {
        border-left: 6px solid #2196f3;
    }

    .card-display.tower {
        border-left: 6px solid #4caf50;
    }

    /* Add some spacing between cards */
    .active-cards {
        display: flex;
        flex-direction: column;
        gap: 1rem;
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

    .coins {
        display: flex;
        align-items: center;
        font-weight: 500;
        color: #ffd700;
        font-size: 1.1rem;
        margin-top: 0.5rem;
        gap: 4px; /* Use gap instead of margin */
        height: 24px; /* Fixed height */
    }

    .coins .coin-icon {
        width: 20px;
        height: 20px;
        display: block;
        filter: brightness(1.5);
    }

    .coins span {
        line-height: 20px; /* Match the icon height */
    }
    .button-group {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .veto-button {
        min-width: 80px;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        color: white;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        background-color: #d32f2f; /* Red color for veto */
    }

    .veto-button:hover {
        transform: translateY(-2px);
        filter: brightness(1.1);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .veto-button:active {
        transform: translateY(0);
    }
    .error-message {
        background-color: rgba(244, 67, 54, 0.1);
        color: #f44336;
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1rem;
        border: 1px solid rgba(244, 67, 54, 0.2);
    }
    .card-display {
        display: flex;
        justify-content: space-between;
        align-items: flex-start; /* Changed from center to flex-start */
        background: rgba(255, 255, 255, 0.1);
        padding: 1.5rem;
        border-radius: 12px;
        margin-top: 1rem;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
    }

    .card-content {
        flex: 1;
        margin-right: 1rem;
    }

    .button-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-width: 120px; /* Ensure consistent button width */
    }

    .complete-button,
    .veto-button {
        width: 100%;
        padding: 0.75rem;
        border: none;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        color: white;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .veto-button {
        background-color: #d32f2f;
    }

    .complete-button:hover,
    .veto-button:hover {
        transform: translateY(-2px);
        filter: brightness(1.1);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .complete-button:active,
    .veto-button:active {
        transform: translateY(0);
    }

    /* Responsive adjustments */
    @media (max-width: 480px) {
        .card-display {
            flex-direction: column;
        }

        .card-content {
            margin-right: 0;
            margin-bottom: 1rem;
            width: 100%;
        }

        .button-group {
            width: 100%;
        }

        .complete-button,
        .veto-button {
            width: 100%;
        }
    }
</style>
