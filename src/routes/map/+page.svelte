<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { goto } from "$app/navigation";
    import { browser } from "$app/environment";
    import { page } from "$app/stores";
    import BottomNav from "$lib/components/BottomNav.svelte";
    import { supabase } from "$lib/supabaseClient";

    let username = "";
    let loading = true;
    let error = "";
    let mapElement: HTMLDivElement;
    let map: any;
    let marker: any;
    let towerCircle: any;
    let L: any;
    let placingTower: {
        id: string;
        name: string;
        description: string;
        radius: number;
    } | null = null;
    let towersSubscription: any;
    let team = "";

    function milesToMeters(miles: number): number {
        return miles * 1609.34;
    }

    onMount(async () => {
        username = localStorage.getItem("username") || "";
        team = localStorage.getItem("team") || "red"; // Default to red if not set
        if (!username) {
            goto("/login");
            return;
        }

        // Check for tower placement
        const towerParam = $page.url.searchParams.get("placeTower");
        if (towerParam) {
            try {
                const towerData = JSON.parse(decodeURIComponent(towerParam));
                console.log("Tower data from URL:", towerData);
                placingTower = {
                    ...towerData,
                    radius: parseFloat(towerData.radius) || 100, // Ensure radius is a number
                };
                console.log("Parsed placingTower:", placingTower);
            } catch (e) {
                console.error("Error parsing tower data:", e);
            }
        }

        if (browser) {
            try {
                L = (await import("leaflet")).default;
                await initializeMap();
                await loadExistingTowers();
                setupRealtimeSubscription();
            } catch (e) {
                console.error("Error:", e);
                error = e instanceof Error ? e.message : "An error occurred";
            }
        }
        loading = false;
    });

    onDestroy(() => {
        if (towersSubscription) {
            supabase.removeChannel(towersSubscription);
        }
    });

    async function initializeMap() {
        map = L.map(mapElement).setView([0, 0], 2);
        L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
            {
                attribution: "© OpenStreetMap contributors",
                subdomains: "abcd",
                maxZoom: 20,
            },
        ).addTo(map);

        try {
            const position = await getCurrentPosition();
            const { latitude, longitude } = position.coords;
            map.setView([latitude, longitude], 15);

            // Add location marker
            const myIcon = L.divIcon({
                className: "my-location-marker",
                iconSize: [12, 12],
                iconAnchor: [6, 6],
                html: `<div class="marker-inner"></div>`,
            });

            marker = L.marker([latitude, longitude], {
                icon: myIcon,
                zIndexOffset: 1000,
            }).addTo(map);

            // If placing tower, show placement UI
            if (placingTower) {
                showTowerPlacementUI(latitude, longitude);
            }
        } catch (e) {
            console.error("Error:", e);
            error = e instanceof Error ? e.message : "An error occurred";
        }
    }

    async function loadExistingTowers() {
        try {
            const { data: towers, error: towersError } = await supabase
                .from("towers")
                .select("*");

            if (towersError) throw towersError;

            if (towers) {
                towers.forEach((tower) => {
                    addTowerToMap(tower);
                });
            }
        } catch (e) {
            console.error("Error loading towers:", e);
        }
    }

    function addTowerToMap(tower) {
        const color = tower.team === "red" ? "#FF0000" : "#FFFF00"; // Red or Yellow

        const towerCircle = L.circle([tower.latitude, tower.longitude], {
            radius: milesToMeters(tower.radius), // Convert miles to meters
            color: color,
            fillColor: color,
            fillOpacity: 0.2,
            interactive: true, // Make the circle interactive
        }).addTo(map);

        const towerMarker = L.marker([tower.latitude, tower.longitude], {
            icon: L.divIcon({
                className: "tower-marker",
                html: `<div class="tower-icon" style="background-color: ${color};"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
            }),
        }).addTo(map);

        const popupContent = document.createElement("div");
        popupContent.innerHTML = `
                <h3>${tower.name}</h3>
                <p>${tower.description}</p>
                <p>Radius: ${tower.radius} miles</p>
                <button class="delete-tower-button">Delete</button>
            `;

        popupContent
            .querySelector(".delete-tower-button")
            .addEventListener("click", async () => {
                await deleteTower(tower.id, towerMarker, towerCircle);
            });

        towerMarker.bindPopup(popupContent);

        // Store reference to the circle and marker for later removal
        towerMarker.towerCircle = towerCircle;

        // Add event listener to the circle
        towerCircle.on("click", () => {
            towerMarker.openPopup();
        });
    }

    async function deleteTower(
        towerId: string,
        towerMarker: any,
        towerCircle: any,
    ) {
        try {
            console.log(`Attempting to delete tower with ID: ${towerId}`);

            // Log the tower ID being passed to the function
            console.log(`Tower ID: ${towerId}`);

            const { data, error: deleteError } = await supabase
                .from("towers")
                .delete()
                .eq("id", towerId)
                .select();

            if (deleteError) {
                console.error(
                    "Error deleting tower from database:",
                    deleteError,
                );
                throw deleteError;
            }

            if (data.length === 0) {
                console.warn("No tower found with the specified ID.");
                return;
            }

            console.log("Tower deleted from database:", data);

            // Remove the tower marker and circle from the map
            map.removeLayer(towerCircle);
            map.removeLayer(towerMarker);

            // Optionally, show a notification
            if ("Notification" in window) {
                if (Notification.permission === "granted") {
                    new Notification("Tower Deleted", {
                        body: `The tower has been successfully deleted.`,
                        icon: "/favicon.png",
                    });
                } else if (Notification.permission !== "denied") {
                    const permission = await Notification.requestPermission();
                    if (permission === "granted") {
                        new Notification("Tower Deleted", {
                            body: `The tower has been successfully deleted.`,
                            icon: "/favicon.png",
                        });
                    }
                }
            }
        } catch (e) {
            console.error("Error deleting tower:", e);
            error = e.message;
        }
    }

    function showTowerPlacementUI(lat: number, lng: number) {
        // Show radius circle
        console.log("Placing tower with radius:", placingTower.radius);
        towerCircle = L.circle([lat, lng], {
            radius: milesToMeters(placingTower.radius), // Convert miles to meters
            color: "#4CAF50",
            fillColor: "#4CAF50",
            fillOpacity: 0.2,
            interactive: true, // Make the circle interactive
        }).addTo(map);

        // Add place button at current location
        const placeHereButton = L.control({ position: "bottomright" });

        placeHereButton.onAdd = function () {
            const div = L.DomUtil.create("div", "place-here-control");
            div.innerHTML = `
                    <button class="place-here-button" id="placeHereButton">
                        <img src="/map_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg" alt="Place" style="width: 20px; height: 20px; margin-right: 8px;">
                        Place Here
                    </button>
                `;
            return div;
        };

        placeHereButton.addTo(map);

        // Add placement controls at bottom
        const controls = document.createElement("div");
        controls.className = "tower-placement-controls";
        controls.innerHTML = `
                <div class="tower-info">
                    <h3>${placingTower.name}</h3>
                    <p>${placingTower.description}</p>
                    <p class="radius-info">Radius: ${placingTower.radius} miles</p>
                </div>
                <div class="tower-buttons">
                    <button class="cancel-button" id="cancelTower">Cancel</button>
                </div>
            `;
        mapElement.appendChild(controls);

        // Add event listeners
        document
            .getElementById("placeHereButton")
            ?.addEventListener("click", async () => {
                const center = towerCircle.getLatLng();
                await placeTower(center.lat, center.lng);
            });

        document
            .getElementById("cancelTower")
            ?.addEventListener("click", () => {
                goto("/cards");
            });

        // Make circle draggable
        towerCircle.on("mousedown touchstart", function (e: any) {
            map.dragging.disable();
            map.on("mousemove touchmove", updateCirclePosition);
            map.on("mouseup touchend", stopDragging);
            e.originalEvent.preventDefault();
        });
    }

    function updateCirclePosition(e: any) {
        towerCircle.setLatLng(e.latlng);
    }

    function stopDragging() {
        map.dragging.enable();
        map.off("mousemove touchmove", updateCirclePosition);
        map.off("mouseup touchend", stopDragging);
    }

    async function placeTower(lat: number, lng: number) {
        try {
            if (!placingTower) return;

            const radius = parseFloat(placingTower.radius) || 1; // Default to 1 mile
            console.log("Placing tower with radius:", radius);

            const { error: towerError } = await supabase.from("towers").insert({
                username: username,
                player_card_id: placingTower.id,
                latitude: lat,
                longitude: lng,
                radius: radius,
                name: placingTower.name,
                description: placingTower.description,
                team: team, // Include team color
            });

            if (towerError) throw towerError;

            // Send notification
            if ("Notification" in window) {
                if (Notification.permission === "granted") {
                    new Notification("Tower Placed!", {
                        body: `${placingTower.name} has been placed on the map`,
                        icon: "/favicon.png",
                    });
                } else if (Notification.permission !== "denied") {
                    const permission = await Notification.requestPermission();
                    if (permission === "granted") {
                        new Notification("Tower Placed!", {
                            body: `${placingTower.name} has been placed on the map`,
                            icon: "/favicon.png",
                        });
                    }
                }
            }

            // Delete the card
            await supabase
                .from("player_cards")
                .delete()
                .eq("id", placingTower.id);

            await goto("/cards");
        } catch (e) {
            console.error("Error placing tower:", e);
            error = e.message;
        }
    }

    function getCurrentPosition(): Promise<GeolocationPosition> {
        return new Promise((resolve, reject) => {
            if (browser && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0,
                });
            } else {
                reject(new Error("Geolocation not available"));
            }
        });
    }

    function handleSignOut() {
        localStorage.removeItem("username");
        goto("/login");
    }

    function setupRealtimeSubscription() {
        towersSubscription = supabase
            .channel("public:towers")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "towers" },
                (payload) => {
                    console.log("New tower added:", payload.new);
                    addTowerToMap(payload.new);
                },
            )
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "towers" },
                (payload) => {
                    console.log("Tower deleted:", payload.old);
                    removeTowerFromMap(payload.old.id);
                },
            )
            .subscribe();
    }

    function removeTowerFromMap(towerId) {
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker && layer.towerCircle) {
                if (layer.options.id === towerId) {
                    map.removeLayer(layer.towerCircle);
                    map.removeLayer(layer);
                }
            }
        });
    }
</script>

<div class="page-container">
    <nav class="top-nav">
        {#if loading}
            <span>Loading...</span>
        {:else if error}
            <span class="error">{error}</span>
        {:else}
            <span class="welcome">Welcome, {username}!</span>
        {/if}
        <button on:click={handleSignOut}>Sign Out</button>
    </nav>

    <div id="map" bind:this={mapElement}></div>
    <BottomNav />
</div>

<style>
    .page-container {
        height: 100vh;
        display: flex;
        flex-direction: column;
        position: relative;
    }

    .top-nav {
        padding: 1rem 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background-color: rgba(37, 46, 63, 1);
        backdrop-filter: blur(10px);
        z-index: 1000;
    }

    .welcome {
        font-size: 1.1rem;
        font-weight: 500;
        color: #fff;
    }

    button {
        padding: 0.5rem 1rem;
        cursor: pointer;
        background-color: #ff6b6b;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.3s ease;
    }

    button:hover {
        background-color: #ff5252;
        transform: translateY(-1px);
    }

    #map {
        flex: 1;
        width: 100%;
        position: relative;
        z-index: 1;
    }

    .error {
        color: #ff6b6b;
    }

    :global(.leaflet-container) {
        height: 100%;
        width: 100%;
    }

    :global(.my-location-marker) {
        width: 12px !important;
        height: 12px !important;
        margin-left: -6px !important;
        margin-top: -6px !important;
        border-radius: 50%;
        background: #007aff;
        border: 2px solid white;
        box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
    }

    :global(.leaflet-control-attribution) {
        background-color: rgba(255, 255, 255, 0.8) !important;
    }
    :global(.place-here-control) {
        position: absolute;
        right: 10px;
        bottom: 60px; /* Increased from 90px to 160px to move it up */
    }

    :global(.place-here-button) {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px 16px;
        background-color: #4caf50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
        z-index: 1001;
    }

    :global(.place-here-button:hover) {
        background-color: #45a049;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .radius-info {
        color: #4caf50;
        font-weight: 500;
        margin-top: 0.5rem;
    }

    .bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 1002; /* Higher than place button */
    }

    .tower-placement-controls {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(37, 46, 63, 0.95);
        padding: 1rem;
        border-radius: 8px;
        z-index: 1001;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    /* Ensure map controls are visible */
    :global(.leaflet-control-container) {
        z-index: 1000;
    }
    .delete-tower-button {
        background-color: #d32f2f;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .delete-tower-button:hover {
        background-color: #c62828;
    }
</style>
