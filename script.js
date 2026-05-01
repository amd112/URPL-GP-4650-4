mapboxgl.accessToken = 'pk.eyJ1IjoiYW1kMTEyIiwiYSI6ImNtbnhxNHVsbjA0dDUycHExZWRqN2dtaWEifQ.RchV-MZSTqwC8fMtMIy_Xg'; 

const topGuide = document.getElementById('top-guide');
const bottomGuide = document.getElementById('bottom-guide');

//-------------------------------------------------------
// functions 

function updateEdgeGuides() {
    if (!map.getBounds()) return;

    const bounds = map.getBounds();
    const northEdge = bounds.getNorth();
    const southEdge = bounds.getSouth();

    // Trigger for UWS (Top)
    // If the top of our screen is south of the UWS cluster
    if (northEdge < 40.764143) {
        topGuide.classList.add('visible');
    } else {
        topGuide.classList.remove('visible');
    }

    // Trigger for Brooklyn (Bottom)
    // If the bottom of our screen is north of the Brooklyn cluster
    if (southEdge > 40.690934) {
        bottomGuide.classList.add('visible');
    } else {
        bottomGuide.classList.remove('visible');
    }
}

function toggleDescription() {
    const content = document.getElementById('desc-content');
    const arrow = document.getElementById('toggle-arrow');
    
    // Toggle the class
    content.classList.toggle('collapsed');
    
    // Rotate arrow for visual feedback
    if (content.classList.contains('collapsed')) {
        arrow.style.transform = 'rotate(-90deg)';
        arrow.innerText = '▸';
    } else {
        arrow.style.transform = 'rotate(0deg)';
        arrow.innerText = '▾';
    }
}

//-------------------------------------------------------
// map! 
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [-73.966, 40.673],
    zoom: 13.25
});

map.on('load', () => {

    // bring in data
    map.addSource('apartments', {
        type: 'geojson',
        data: 'apartments.geojson'
    });

    //-------------------------------------------------------
    // glows

    // add base layer "glow" for places I visited
    map.addLayer({
        id: 'visited-glow',
        type: 'circle',
        source: 'apartments',
        paint: {
            'circle-radius': ['case',
                ['all', 
                    ['==', ['get', 'visit'], 1], 
                    ['==', ['get', 'apply'], 0]
            ], 35, 0], 
            'circle-color': '#2A2D34',
            'circle-blur': 2,
            'circle-opacity': 0.7
        }
    });

    // add layer "glow" for places I applied to
    map.addLayer({
        id: 'applied-glow',
        type: 'circle',
        source: 'apartments',
        paint: {
            'circle-radius': ['match', ['get', 'apply'], 1, 45, 0],
            'circle-color': '#59A55C',
            'circle-blur': 1.8,
            'circle-opacity': 1
        }
    });

    //-------------------------------------------------------
    // points
    map.addLayer({
        id: 'apartments-main',
        type: 'circle',
        source: 'apartments',
        paint: {
            // radius = smaller for expensive 
            'circle-radius': [
                'interpolate', ['linear'], ['get', 'price_per_bed'],
                900, 10,
                2000, 4
            ],
            // color = based on my rent
            'circle-color': [
                'interpolate', ['linear'], ['get', 'A1'],
                1000, '#91D694',  // Matches Legend Start
                1500, '#ffdac1',  // Middle
                2000, '#F54927'   // Matches Legend End
            ],
            
            // border = rent stabilized
            'circle-stroke-width': ['match', ['get', 'rs'], 1, 2.5, 1],
            'circle-stroke-color': ['match', ['get', 'rs'], 1, '#363636', '#ffffff'],
            'circle-opacity': 1
        }
    });

    //-------------------------------------------------------
    // popups
    map.on('click', 'apartments-main', (e) => {

        // get coords
        const coordinates = e.features[0].geometry.coordinates.slice();
        const p = e.features[0].properties;
        
        // add fun little text for each of the states
        const status = p.apply ? "💖 Applied" : (p.visit ? "✨ Visited" : "📍 Saved");
        

        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        // combo the text for the popup and set 
        new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`
                <div style="padding:5px; font-family: 'Helvetica Neue', sans-serif;">
                    <h3 style="margin:0; color:#333;">$${p.price}</h3>
                    <p style="margin:5px 0; color:#F54927;"><b>${status}</b></p>
                    <p style="margin:0; font-size:12px"><b>My Share:</b> $${p.A1}</p>
                    <p style="margin:2px 0; font-size:12px"><b>Per Bed:</b> $${p.price_per_bed}</p>
                    <p style="margin:8px 0 0; font-size:11px; color:#888; text-transform:uppercase; letter-spacing:0.5px;">
                        ${p.rs ? '🔒 Rent Stabilized' : '📈 Market Rate'}
                    </p>
                </div>
            `)
            .addTo(map);
    });

// figure out when to show brooklyn or UWS
map.on('move', updateEdgeGuides);

// teleport to the cluster on clock
topGuide.addEventListener('click', () => {
    map.flyTo({ center: [-73.966, 40.811], zoom: 12.5 });
});

bottomGuide.addEventListener('click', () => {
    map.flyTo({ center: [-73.966, 40.673], zoom: 13 });
});


    map.on('mouseenter', 'apartments-main', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'apartments-main', () => map.getCanvas().style.cursor = '');
});