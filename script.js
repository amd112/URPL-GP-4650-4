document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'close-intro') {
        const modal = document.getElementById('intro-modal');
        if (modal) {
            modal.style.display = 'none';
            console.log("Modal closed");
        }
    }
});

const nycBounds = [
    [-74.25909, 40.477399], 
    [-73.700272, 40.917577]
];

// Run the modal setup as soon as the window loads
window.onload = setupModal;

// This ensures buttons go back to light grey/dark text when toggled off
const resetBtnStyle = (btn) => {
    console.log("Resetting button:", btn.id); // Check your console to see if this appears
    
    btn.classList.remove('active');
    
    // This removes the inline 'style' attributes entirely
    // so the button MUST go back to your CSS settings
    btn.style.removeProperty('background-color');
    btn.style.removeProperty('color');
    
    // Just in case, force the browser to see it as white
    btn.style.backgroundColor = "#ffffff";
    btn.style.color = "#000000";
};

mapboxgl.accessToken = 'pk.eyJ1IjoiYW1kMTEyIiwiYSI6ImNtbnhxNHVsbjA0dDUycHExZWRqN2dtaWEifQ.RchV-MZSTqwC8fMtMIy_Xg';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-73.96, 40.71],
    zoom: 13,
    pitch: 45,
    maxBounds: nycBounds 
});

const sources = {
    relief: "data/relief.geojson",
    hydration: "data/hydration.geojson",
    energy: ["data/linknyc.geojson", "data/nypl_mn.geojson", "data/nypl_si.geojson", "data/nypl_bx.geojson", "data/library_qn.geojson"]
};

const colors = {
    relief: '#FF5733', 
    hydration: '#33CCFF',
    energy: '#FFD700'
};

const activeCategories = new Set();


async function toggleCategory(category) {
    console.log("Button clicked for:", category); // This will prove the function is running
    
    const btn = document.getElementById(`btn-${category}`);
    if (!btn) return;

    // Check if the button is ALREADY active by looking at its class
    const isCurrentlyActive = btn.classList.contains('active');

    if (isCurrentlyActive) {
        // --- TURN OFF LOGIC ---
        console.log("Turning OFF:", category);
        btn.classList.remove('active');
        
        // Force the background to WHITE and text to BLACK
        btn.style.backgroundColor = "#ffffff";
        btn.style.color = "#000000";
        
        activeCategories.delete(category);

        if (map.getLayer(`${category}-layer`)) {
            map.setLayoutProperty(`${category}-layer`, 'visibility', 'none');
        }
    } else {
        // --- TURN ON LOGIC ---
        console.log("Turning ON:", category);
        btn.classList.add('active');
        
        // Set the color from your colors object
        btn.style.backgroundColor = colors[category];
        btn.style.color = '#000000';
        
        activeCategories.add(category);

        if (map.getSource(category)) {
            map.setLayoutProperty(`${category}-layer`, 'visibility', 'visible');
        } else {
            await loadNewLayer(category);
        }
    }
}

// 4. MAP LOAD EVENTS
map.on('load', () => {
    // Add user location
    const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
    });
    map.addControl(geolocate);
    geolocate.trigger();

    // Auto-toggle restrooms
    setTimeout(() => toggleCategory('relief'), 500);
});

// 5. DATA LOADING LOGIC
async function loadNewLayer(category) {
    const status = document.getElementById('status-indicator');
    status.style.display = 'block';

    try {
        let paths = Array.isArray(sources[category]) ? sources[category] : [sources[category]];
        const results = await Promise.all(paths.map(path => 
            fetch(path).then(res => {
                if (!res.ok) throw new Error("File not found");
                return res.json();
            })
        ));
        
        const mergedFeatures = results.flatMap(data => data.features);
        const geojson = { type: "FeatureCollection", features: mergedFeatures };

        map.addSource(category, { type: 'geojson', data: geojson });

        map.addLayer({
            id: `${category}-layer`,
            type: 'circle',
            source: category,
            filter: ['==', ['geometry-type'], 'Point'],
            paint: {
                'circle-radius': 6,
                'circle-color': colors[category],
                'circle-blur': 1,
                'circle-opacity': 0.9
            }
        });

        setupPopupListeners(category);
    } catch (err) {
        console.error("Error loading data:", err);
    } finally {
        status.style.display = 'none';
    }
}

function setupPopupListeners(category) {
    map.on('click', `${category}-layer`, (e) => {
        const props = e.features[0].properties;
        const name = props.name || props.facility_name || props.title || "Resource";
        const addr = props.address || props.location || "-";

        new mapboxgl.Popup({ offset: [0, -10] })
            .setLngLat(e.lngLat)
            .setHTML(`
                <span class="popup-category-pill" style="background:${colors[category]}33; color:${colors[category]}">${category}</span>
                <h3 class="popup-title" style="color:white; margin-top:5px;">${name}</h3>
                <p class="popup-address" style="color:#aaa;">${addr}</p>
            `)
            .addTo(map);
    });

    map.on('mouseenter', `${category}-layer`, () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', `${category}-layer`, () => map.getCanvas().style.cursor = '');
}