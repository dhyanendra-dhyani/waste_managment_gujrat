// ========== Configuration ==========
const FIREBASE_CONFIG = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// For demo purposes, we'll use simulated data
// Replace with actual Firebase initialization:
// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ========== Global Variables ==========
let dashboardMap, mainMap, routeMap;
let binMarkers = [];
let truckMarkers = [];
let routePolyline = null;
let currentFilter = 'all';

// Ahmedabad coordinates
const AHMEDABAD_CENTER = [23.0225, 72.5714];

// ========== Sample Bin Data (Replace with Firebase real-time data) ==========
let binData = [
    { id: 'BIN001', lat: 23.0225, lng: 72.5714, fillLevel: 85, location: 'SG Highway', lastCollection: '2 hours ago', status: 'critical', area: 'West' },
    { id: 'BIN002', lat: 23.0335, lng: 72.5664, fillLevel: 65, location: 'Satellite', lastCollection: '5 hours ago', status: 'warning', area: 'West' },
    { id: 'BIN003', lat: 23.0425, lng: 72.5814, fillLevel: 35, location: 'Prahladnagar', lastCollection: '1 day ago', status: 'normal', area: 'West' },
    { id: 'BIN004', lat: 23.0125, lng: 72.5514, fillLevel: 92, location: 'Vastrapur', lastCollection: '1 hour ago', status: 'critical', area: 'West' },
    { id: 'BIN005', lat: 23.0525, lng: 72.5914, fillLevel: 45, location: 'Bodakdev', lastCollection: '8 hours ago', status: 'normal', area: 'West' },
    { id: 'BIN006', lat: 23.0020, lng: 72.5800, fillLevel: 78, location: 'CG Road', lastCollection: '3 hours ago', status: 'warning', area: 'Central' },
    { id: 'BIN007', lat: 23.0300, lng: 72.6100, fillLevel: 25, location: 'Thaltej', lastCollection: '12 hours ago', status: 'normal', area: 'West' },
    { id: 'BIN008', lat: 23.0450, lng: 72.5550, fillLevel: 88, location: 'Navrangpura', lastCollection: '2 hours ago', status: 'critical', area: 'Central' },
    { id: 'BIN009', lat: 22.9950, lng: 72.5950, fillLevel: 52, location: 'Maninagar', lastCollection: '6 hours ago', status: 'normal', area: 'East' },
    { id: 'BIN010', lat: 23.0150, lng: 72.6050, fillLevel: 70, location: 'Jodhpur', lastCollection: '4 hours ago', status: 'warning', area: 'West' },
];

// Sample truck data
let truckData = [
    { id: 'TRUCK1', lat: 23.0300, lng: 72.5700, status: 'active', route: 'Route A', capacity: '75%' },
    { id: 'TRUCK2', lat: 23.0100, lng: 72.5900, status: 'active', route: 'Route B', capacity: '60%' },
    { id: 'TRUCK3', lat: 23.0400, lng: 72.5600, status: 'active', route: 'Route C', capacity: '45%' },
];

// ========== Navigation ==========
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.currentTarget.getAttribute('data-section');
        
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        // Update active section
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(section).classList.add('active');
        
        // Initialize maps when sections become active
        if (section === 'map' && !mainMap) {
            setTimeout(() => initMainMap(), 100);
        } else if (section === 'routes' && !routeMap) {
            setTimeout(() => initRouteMap(), 100);
        }
    });
});

// ========== Initialize Dashboard ==========
window.addEventListener('load', () => {
    initDashboard();
    initDashboardMap();
    populateAlerts();
    populateRecentCollections();
    initCharts();
    initEventListeners();
    
    // Simulate real-time updates
    setInterval(updateDashboardData, 5000);
});

function initDashboard() {
    updateKPIs();
}

function updateKPIs() {
    const totalBins = binData.length;
    const fullBins = binData.filter(b => b.fillLevel >= 80).length;
    const activeTrucks = truckData.filter(t => t.status === 'active').length;
    
    document.getElementById('totalBins').textContent = totalBins;
    document.getElementById('fullBins').textContent = fullBins;
    document.getElementById('activeTrucks').textContent = activeTrucks;
    document.getElementById('fuelSaved').textContent = '29%';
}

// ========== Maps Initialization ==========
function initDashboardMap() {
    dashboardMap = L.map('dashboardMap').setView(AHMEDABAD_CENTER, 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(dashboardMap);
    
    addMarkersToMap(dashboardMap, binData);
}

function initMainMap() {
    mainMap = L.map('mainMap').setView(AHMEDABAD_CENTER, 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mainMap);
    
    addMarkersToMap(mainMap, binData);
    addTruckMarkers(mainMap);
}

function initRouteMap() {
    routeMap = L.map('routeMap').setView(AHMEDABAD_CENTER, 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(routeMap);
    
    addMarkersToMap(routeMap, binData);
}

function addMarkersToMap(map, bins) {
    bins.forEach(bin => {
        // Create a divIcon that looks like a small dustbin / trash can
        const markerHtml = `
            <div class="bin-marker bin-${bin.status}">
                <i class="fas fa-trash bin-icon"></i>
            </div>
        `;

        const binIcon = L.divIcon({
            className: 'bin-div-icon', // keep outer class small so Leaflet doesn't apply default styles
            html: markerHtml,
            iconSize: [28, 36],
            iconAnchor: [14, 36]
        });

        const marker = L.marker([bin.lat, bin.lng], {
            icon: binIcon
        }).addTo(map);
        
        const popupContent = `
            <div class="custom-popup">
                <h3>${bin.id}</h3>
                <p><strong>Location:</strong> ${bin.location}</p>
                <p><strong>Fill Level:</strong> ${bin.fillLevel}%</p>
                <div class="popup-progress">
                    <div class="popup-progress-bar ${bin.status}" style="width: ${bin.fillLevel}%"></div>
                </div>
                <p><strong>Last Collection:</strong> ${bin.lastCollection}</p>
                <p><strong>Status:</strong> <span class="status-badge ${bin.status}">${bin.status.toUpperCase()}</span></p>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        binMarkers.push({ marker, bin });
    });
}

function addTruckMarkers(map) {
    truckData.forEach(truck => {
        const truckIcon = L.divIcon({
            className: 'truck-marker',
            html: '<i class="fas fa-truck" style="font-size: 24px; color: #3498db;"></i>',
            iconSize: [30, 30]
        });
        
        const marker = L.marker([truck.lat, truck.lng], {
            icon: truckIcon
        }).addTo(map);
        
        marker.bindPopup(`
            <div class="custom-popup">
                <h3>${truck.id}</h3>
                <p><strong>Status:</strong> ${truck.status}</p>
                <p><strong>Route:</strong> ${truck.route}</p>
                <p><strong>Capacity:</strong> ${truck.capacity}</p>
            </div>
        `);
        
        truckMarkers.push(marker);
    });
}

// ========== Alerts ==========
function populateAlerts() {
    const alertList = document.getElementById('alertList');
    const criticalBins = binData.filter(b => b.fillLevel >= 80).slice(0, 5);
    
    alertList.innerHTML = criticalBins.map(bin => `
        <div class="alert-item ${bin.status}" onclick="zoomToBin('${bin.id}')">
            <h4>${bin.id} - ${bin.location}</h4>
            <p>Fill Level: ${bin.fillLevel}%</p>
            <p class="alert-time">Updated: ${bin.lastCollection}</p>
        </div>
    `).join('');
}

function zoomToBin(binId) {
    const bin = binData.find(b => b.id === binId);
    if (bin && mainMap) {
        document.querySelector('[data-section="map"]').click();
        setTimeout(() => {
            mainMap.setView([bin.lat, bin.lng], 15);
            const markerData = binMarkers.find(m => m.bin.id === binId);
            if (markerData) {
                markerData.marker.openPopup();
            }
        }, 200);
    }
}

// ========== Recent Collections Table ==========
function populateRecentCollections() {
    const tableBody = document.getElementById('recentCollectionsTable');
    const recentBins = [...binData].sort((a, b) => b.fillLevel - a.fillLevel).slice(0, 8);
    
    tableBody.innerHTML = recentBins.map(bin => `
        <tr>
            <td>${bin.id}</td>
            <td>${bin.location}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="flex: 1; background: #e0e0e0; border-radius: 10px; height: 8px;">
                        <div style="width: ${bin.fillLevel}%; height: 100%; background: ${bin.status === 'critical' ? '#e74c3c' : bin.status === 'warning' ? '#f39c12' : '#2ecc71'}; border-radius: 10px;"></div>
                    </div>
                    <span>${bin.fillLevel}%</span>
                </div>
            </td>
            <td>${bin.lastCollection}</td>
            <td><span class="status-badge ${bin.status}">${bin.status.toUpperCase()}</span></td>
        </tr>
    `).join('');
}

// ========== Charts ==========
function initCharts() {
    // Fill Trend Chart
    const fillTrendCtx = document.getElementById('fillTrendChart').getContext('2d');
    new Chart(fillTrendCtx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Average Fill Level (%)',
                data: [45, 52, 48, 65, 72, 68, 58],
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
    
    // Status Pie Chart
    const statusPieCtx = document.getElementById('statusPieChart').getContext('2d');
    const criticalCount = binData.filter(b => b.status === 'critical').length;
    const warningCount = binData.filter(b => b.status === 'warning').length;
    const normalCount = binData.filter(b => b.status === 'normal').length;
    
    new Chart(statusPieCtx, {
        type: 'doughnut',
        data: {
            labels: ['Critical', 'Warning', 'Normal'],
            datasets: [{
                data: [criticalCount, warningCount, normalCount],
                backgroundColor: ['#e74c3c', '#f39c12', '#2ecc71']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Efficiency Chart
    const efficiencyCtx = document.getElementById('efficiencyChart').getContext('2d');
    new Chart(efficiencyCtx, {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [
                {
                    label: 'Collections',
                    data: [145, 132, 128, 118],
                    backgroundColor: '#3498db'
                },
                {
                    label: 'Fuel Used (L)',
                    data: [340, 310, 285, 260],
                    backgroundColor: '#f39c12'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Area Chart
    const areaCtx = document.getElementById('areaChart').getContext('2d');
    const areaData = {};
    binData.forEach(bin => {
        areaData[bin.area] = (areaData[bin.area] || 0) + 1;
    });
    
    new Chart(areaCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(areaData),
            datasets: [{
                label: 'Bins per Area',
                data: Object.values(areaData),
                backgroundColor: '#2ecc71'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// ========== Filter Functions ==========
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        currentFilter = e.currentTarget.getAttribute('data-filter');
        filterBins(currentFilter);
    });
});

function filterBins(filter) {
    binMarkers.forEach(({ marker, bin }) => {
        if (filter === 'all') {
            marker.setOpacity(1);
        } else if (filter === bin.status) {
            marker.setOpacity(1);
        } else {
            marker.setOpacity(0.2);
        }
    });
}

// ========== Route Optimization ==========
document.getElementById('generateRoute')?.addEventListener('click', generateOptimalRoute);

function generateOptimalRoute() {
    // Get all critical and warning bins
    const binsToCollect = binData.filter(b => b.fillLevel >= 60);
    
    // Simple nearest neighbor algorithm for demonstration
    const sortedBins = [...binsToCollect].sort((a, b) => b.fillLevel - a.fillLevel);
    
    // Create route polyline
    if (routePolyline) {
        routeMap.removeLayer(routePolyline);
    }
    
    const routePoints = sortedBins.map(b => [b.lat, b.lng]);
    routePolyline = L.polyline(routePoints, {
        color: '#3498db',
        weight: 4,
        opacity: 0.7
    }).addTo(routeMap);
    
    routeMap.fitBounds(routePolyline.getBounds());
    
    // Update route info
    document.getElementById('routeBins').textContent = sortedBins.length;
    document.getElementById('routeDistance').textContent = calculateTotalDistance(sortedBins).toFixed(1) + ' km';
    document.getElementById('routeDuration').textContent = calculateDuration(sortedBins);
    document.getElementById('routeFuel').textContent = (calculateTotalDistance(sortedBins) * 0.25).toFixed(1) + ' L';
    
    // Update route sequence
    const routeSequence = document.getElementById('routeSequence');
    routeSequence.innerHTML = sortedBins.map((bin, index) => `
        <li>${bin.location} - ${bin.id} (${bin.fillLevel}% full)</li>
    `).join('');
}

function calculateTotalDistance(bins) {
    let total = 0;
    for (let i = 0; i < bins.length - 1; i++) {
        total += getDistance(bins[i].lat, bins[i].lng, bins[i + 1].lat, bins[i + 1].lng);
    }
    return total;
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calculateDuration(bins) {
    const distance = calculateTotalDistance(bins);
    const avgSpeed = 25; // km/h in city
    const collectionTime = bins.length * 5; // 5 min per bin
    const totalMinutes = (distance / avgSpeed * 60) + collectionTime;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}h ${minutes}m`;
}

// ========== Public Report Form ==========
function initEventListeners() {
    document.getElementById('reportForm')?.addEventListener('submit', handleReportSubmit);
    document.getElementById('checkSchedule')?.addEventListener('click', handleScheduleCheck);
    document.getElementById('exportRoute')?.addEventListener('click', exportRoute);
}

function handleReportSubmit(e) {
    e.preventDefault();
    
    const reportData = {
        name: document.getElementById('reporterName').value,
        phone: document.getElementById('reporterPhone').value,
        location: document.getElementById('reportLocation').value,
        issueType: document.getElementById('issueType').value,
        description: document.getElementById('issueDescription').value,
        timestamp: new Date().toISOString()
    };
    
    // In production, send to Firebase
    console.log('Report submitted:', reportData);
    
    alert('Thank you! Your report has been submitted successfully. Our team will address this issue within 2 hours.');
    e.target.reset();
}

function handleScheduleCheck() {
    const area = document.getElementById('scheduleSearch').value;
    const resultDiv = document.getElementById('scheduleResult');
    
    if (area) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <h4>Collection Schedule for ${area}</h4>
            <p><strong>Next Collection:</strong> Tomorrow at 7:00 AM</p>
            <p><strong>Frequency:</strong> Daily (Mon-Sat)</p>
            <p><strong>Truck ID:</strong> GJ01AB1234</p>
            <p style="color: #2ecc71; margin-top: 10px;">✓ Your area is on schedule</p>
        `;
    }
}

function exportRoute() {
    alert('Route exported successfully! Check your downloads folder.');
}

// ========== Real-time Updates Simulation ==========
function updateDashboardData() {
    // Simulate random fill level changes
    binData.forEach(bin => {
        const change = Math.random() * 2 - 0.5; // -0.5 to +1.5
        bin.fillLevel = Math.min(100, Math.max(0, bin.fillLevel + change));
        
        if (bin.fillLevel >= 80) bin.status = 'critical';
        else if (bin.fillLevel >= 60) bin.status = 'warning';
        else bin.status = 'normal';
    });
    
    updateKPIs();
    populateAlerts();
}

// ========== Search Functionality ==========
document.getElementById('searchLocation')?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    binMarkers.forEach(({ marker, bin }) => {
        if (bin.location.toLowerCase().includes(searchTerm) || 
            bin.id.toLowerCase().includes(searchTerm)) {
            marker.setOpacity(1);
        } else {
            marker.setOpacity(0.2);
        }
    });
});

console.log('Smart Waste Management System Initialized Successfully!');
