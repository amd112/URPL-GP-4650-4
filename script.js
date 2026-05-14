document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('intro-modal');
    const closeBtn = document.querySelector('.modal-close-btn');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            console.log("Modal closed via Event Listener");
        });
    }
});

mapboxgl.accessToken = 'pk.eyJ1IjoiYW1kMTEyIiwiYSI6ImNtbnhxNHVsbjA0dDUycHExZWRqN2dtaWEifQ.RchV-MZSTqwC8fMtMIy_Xg'; 

const sources = {
    relief: "data/relief.geojson",
    hydration: "data/hydration.geojson",
    energy: ["data/linknyc.geojson", 
            "data/nypl_mn.geojson", 
            "data/nypl_si.geojson", 
            "data/nypl_bx.geojson", 
            "data/library_qn.geojson"], // Add your full list here
    sanctuary: ["data/sanctuary.geojson", "data/parks.geojson"], 
    water: "data/waterfountains.geojson"
};

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-73.96, 40.71],
    zoom: 13,
    pitch: 45
});

// User Location logic
const geolocate = new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserHeading: true
});
map.addControl(geolocate);

map.on('load', () => {
    geolocate.trigger();
});

const colors = {
    relief: '#FF5733', hydration: '#33CCFF',
    energy: '#FFD700', sanctuary: '#2ECC71'
};

const activeCategories = new Set();

async function toggleCategory(category) {
    const btn = document.getElementById(`btn-${category}`);
    
    if (activeCategories.has(category)) {
        activeCategories.delete(category);
        btn.classList.remove('active');
        btn.style.backgroundColor = 'transparent';
        btn.style.color = '';
        
        if (map.getLayer(`${category}-layer`)) map.setLayoutProperty(`${category}-layer`, 'visibility', 'none');
        if (map.getLayer(`${category}-fill`)) map.setLayoutProperty(`${category}-fill`, 'visibility', 'none');
    } else {
        activeCategories.add(category);
        btn.classList.add('active');
        btn.style.backgroundColor = colors[category];
        btn.style.color = '#000';

        if (map.getSource(category)) {
            map.setLayoutProperty(`${category}-layer`, 'visibility', 'visible');
            if (map.getLayer(`${category}-fill`)) map.setLayoutProperty(`${category}-fill`, 'visibility', 'visible');
        } else {
            await loadNewLayer(category);
        }
    }
}

async function loadNewLayer(category) {
    const status = document.getElementById('status-indicator');
    status.style.display = 'block';

    try {
        let paths = Array.isArray(sources[category]) ? sources[category] : [sources[category]];
        const results = await Promise.all(paths.map(path => fetch(path).then(res => res.json())));
        const mergedFeatures = results.flatMap(data => data.features);
        const geojson = { type: "FeatureCollection", features: mergedFeatures };

        map.addSource(category, { type: 'geojson', data: geojson });

        // Add Polygon Fill (Bottom Layer)
        if (category === 'sanctuary') {
            map.addLayer({
                id: `${category}-fill`,
                type: 'fill',
                source: category,
                filter: ['==', ['geometry-type'], 'Polygon'],
                paint: { 'fill-color': colors[category], 'fill-opacity': 0.3 }
            }, 'road-label'); // Places it behind text/roads
        }

        // Add Glowing Points
        map.addLayer({
            id: `${category}-layer`,
            type: 'circle',
            source: category,
            filter: ['==', ['geometry-type'], 'Point'],
            paint: {
                'circle-radius': 6,
                'circle-color': colors[category],
                'circle-stroke-width': 0,
                'circle-stroke-color': '#fff',
                'circle-blur': 1, // Soft dashboard glow
                'circle-opacity': 0.9
            }
        });

        setupPopupListeners(category);
    } catch (err) {
        console.error("Fetch Error for:", category, err);
    } finally {
        status.style.display = 'none';
    }
}

function setupPopupListeners(category) {
    map.on('click', `${category}-layer`, (e) => {
        const props = e.features[0].properties;
        const name = props.name || props.facility_name || props.facname || props.propertyna || props.title || props.planned_kiosk_type || props.branch || props.signname || props.gardenname || props.description;
        const addr = props.address || props.location || props.address_1 || props.crossstreets || props.position  || props.street_address || "-";

        new mapboxgl.Popup({ offset: [0, -10] })
            .setLngLat(e.lngLat)
            .setHTML(`
                <span class="popup-category-pill" style="background:${colors[category]}33; color:${colors[category]}">${category}</span>
                <h3 class="popup-title">${name}</h3>
                <p class="popup-address">${addr}</p>
            `)
            .addTo(map);
    });

    map.on('mouseenter', `${category}-layer`, () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', `${category}-layer`, () => map.getCanvas().style.cursor = '');
}
