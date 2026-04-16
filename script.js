document.addEventListener('DOMContentLoaded', () => {
    switchView('search');

    document.getElementById('donorForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        let fileInput = document.getElementById('certificate');
        let fileName = fileInput.files.length > 0 ? fileInput.files[0].name : "No file";

        const newDonor = {
            id: Date.now(),
            name: document.getElementById('name').value,
            group: document.getElementById('group').value,
            phone: document.getElementById('phone').value,
            location: document.getElementById('location').value,
            pin: document.getElementById('pin').value,
            fileName: fileName,
            status: "pending",
            donations: 0, 
            lastDonated: null 
        };

        let donors = JSON.parse(localStorage.getItem('donors')) || [];
        
        if(donors.some(d => d.phone === newDonor.phone)) {
            alert("This phone number is already registered!");
            return;
        }

        donors.push(newDonor);
        localStorage.setItem('donors', JSON.stringify(donors));

        this.reset();
        alert("Registration Submitted! You will appear in the directory once the Admin approves your medical certificate.");
        
        switchView('search');
    });

    document.getElementById('filterGroup').addEventListener('change', displayDonors);
    document.getElementById('filterLocation').addEventListener('input', displayDonors);
    document.getElementById('urgentOnly').addEventListener('change', displayDonors);
});

function adminLogin() {
    let pass = prompt("Enter Admin Password:");
    if (pass === "admin123") {
        switchView('admin');
        renderAdmin();
    } else {
        alert("❌ Incorrect Password. Access Denied.");
    }
}

function switchView(viewName) {
    document.querySelectorAll('.app-view').forEach(view => view.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    if(viewName === 'search') {
        document.getElementById('view-search').style.display = 'block';
        document.getElementById('btn-search').classList.add('active');
        displayDonors(); 
    } 
    else if (viewName === 'register') {
        document.getElementById('view-register').style.display = 'block';
        document.getElementById('btn-register').classList.add('active');
    }
    else if (viewName === 'dashboard') {
        document.getElementById('view-dashboard').style.display = 'block';
        document.getElementById('btn-profile').classList.add('active');
    }
    else if (viewName === 'admin') {
        document.getElementById('view-admin').style.display = 'block';
        document.getElementById('btn-admin').classList.add('active');
    }
}

function displayDonors() {
    const list = document.getElementById('donorList');
    const filterGroup = document.getElementById('filterGroup').value;
    const filterLocation = document.getElementById('filterLocation').value.toLowerCase();
    const urgentOnly = document.getElementById('urgentOnly').checked;
    
    let donors = JSON.parse(localStorage.getItem('donors')) || [];
    list.innerHTML = ""; 

    const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000; 

    donors.forEach(donor => {
        if (donor.status === "pending") return;
        if (filterGroup !== "All" && donor.group !== filterGroup) return;
        if (filterLocation && !donor.location.toLowerCase().includes(filterLocation)) return;

        let isOnCooldown = false;
        let daysLeft = 0;
        
        if (donor.lastDonated) {
            let timePassed = Date.now() - donor.lastDonated;
            if (timePassed < COOLDOWN_MS) {
                isOnCooldown = true;
                daysLeft = Math.ceil((COOLDOWN_MS - timePassed) / (1000 * 60 * 60 * 24));
            }
        }

        if (urgentOnly && isOnCooldown) return;

        let badgeHTML = "";
        if (donor.donations >= 5) badgeHTML = `<span class="trust-badge badge-gold">🥇 Gold (${donor.donations})</span>`;
        else if (donor.donations >= 3) badgeHTML = `<span class="trust-badge badge-silver">🥈 Silver (${donor.donations})</span>`;
        else if (donor.donations >= 1) badgeHTML = `<span class="trust-badge badge-bronze">🥉 Bronze (${donor.donations})</span>`;

        let waText = encodeURIComponent(`URGENT: Hi ${donor.name}, we are looking for ${donor.group} blood in ${donor.location}. Are you available to help?`);

        const card = document.createElement('div');
        card.className = `donor-card ${isOnCooldown ? 'locked' : ''}`;
        
        card.innerHTML = `
            <span class="blood-badge">${donor.group}</span>
            ${badgeHTML}
            <h3>${donor.name}</h3>
            <p>📍 ${donor.location}</p>
            <p>📞 +91 ${donor.phone}</p>
            
            ${isOnCooldown ? 
                `<div class="cooldown-alert">⏳ Resting. Eligible in ${daysLeft} days</div>` : 
                `
                <div class="card-actions">
                    <a href="tel:${donor.phone}" class="btn btn-call">📞 Call</a>
                    <a href="https://wa.me/91${donor.phone}?text=${waText}" target="_blank" class="btn btn-wa">💬 WhatsApp</a>
                </div>
                `
            }
        `;
        list.appendChild(card);
    });
}

function renderAdmin() {
    const list = document.getElementById('pendingList');
    let donors = JSON.parse(localStorage.getItem('donors')) || [];
    list.innerHTML = ""; 

    let pendingDonors = donors.filter(d => d.status === "pending");

    if (pendingDonors.length === 0) {
        list.innerHTML = "<p style='font-size: 1.1rem; color: #555;'>No pending approvals at the moment.</p>";
        return;
    }

    pendingDonors.forEach(donor => {
        const card = document.createElement('div');
        card.className = `donor-card`;
        card.style.borderTop = "5px solid #ff9800";
        
        card.innerHTML = `
            <span class="blood-badge" style="background:#ff9800;">Pending</span>
            <h3>${donor.name}</h3>
            <p>🩸 Group: <b>${donor.group}</b></p>
            <p>📍 Location: ${donor.location}</p>
            <p>📞 +91 ${donor.phone}</p>
            <div style="background: #f4f6f9; padding: 10px; margin-top: 10px; border-radius: 5px; font-size: 0.9rem;">
                📄 <b>Document:</b> ${donor.fileName}
            </div>
            
            <div class="card-actions">
                <button class="btn btn-wa" onclick="approveDonor(${donor.id})">✅ Approve</button>
                <button class="btn btn-delete" onclick="rejectDonor(${donor.id})">❌ Reject</button>
            </div>
        `;
        list.appendChild(card);
    });
}

function approveDonor(id) {
    let donors = JSON.parse(localStorage.getItem('donors')) || [];
    let index = donors.findIndex(d => d.id === id);
    if(index !== -1) {
        donors[index].status = "approved";
        localStorage.setItem('donors', JSON.stringify(donors));
        renderAdmin();
    }
}

function rejectDonor(id) {
    if(confirm("Are you sure you want to reject and delete this application?")) {
        let donors = JSON.parse(localStorage.getItem('donors')) || [];
        donors = donors.filter(d => d.id !== id);
        localStorage.setItem('donors', JSON.stringify(donors));
        renderAdmin();
    }
}

function loginUser() {
    let phone = prompt("Enter your registered Phone Number:");
    if (!phone) return;

    let donors = JSON.parse(localStorage.getItem('donors')) || [];
    let userIndex = donors.findIndex(d => d.phone === phone);

    if (userIndex !== -1) {
        let pin = prompt(`Enter your 4-digit PIN for ${donors[userIndex].name}:`);
        if (donors[userIndex].pin === pin) {
            if (donors[userIndex].status === "pending") {
                alert("⏳ Your profile is currently pending Admin approval. Please check back later.");
                return;
            }
            renderDashboard(donors[userIndex].id);
            switchView('dashboard');
        } else {
            alert("❌ Incorrect PIN! Access Denied.");
        }
    } else {
        alert("❌ No user found with this phone number. Please register first.");
    }
}

function renderDashboard(id) {
    let donors = JSON.parse(localStorage.getItem('donors')) || [];
    let user = donors.find(d => d.id === id);
    if (!user) return;

    const dashboard = document.getElementById('view-dashboard');

    let isOnCooldown = false;
    let daysLeft = 0;
    const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000; 
    
    if (user.lastDonated) {
        let timePassed = Date.now() - user.lastDonated;
        if (timePassed < COOLDOWN_MS) {
            isOnCooldown = true;
            daysLeft = Math.ceil((COOLDOWN_MS - timePassed) / (1000 * 60 * 60 * 24));
        }
    }

    dashboard.innerHTML = `
        <h2 style="color: #2196F3;">Welcome to your Dashboard, ${user.name}!</h2>
        <div style="background: #f4f6f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p><strong>Blood Group:</strong> ${user.group} | <strong>Total Donations:</strong> ${user.donations}</p>
            <p><strong>Registered Phone:</strong> +91 ${user.phone}</p>
        </div>
        
        ${isOnCooldown ? 
            `<div class="cooldown-alert" style="margin-bottom: 15px; padding: 15px; font-size: 1.1rem;">⏳ You are currently on medical cooldown. Eligible to donate again in <b>${daysLeft} days</b>.</div>` : 
            `<p style="color: green; font-weight: bold; margin-bottom: 15px; font-size: 1.1rem;">✅ You are currently active and visible to patients.</p>`
        }

        <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 20px;">
            ${!isOnCooldown ? `<button class="btn btn-donate" onclick="markDonated(${user.id})">🩸 I Donated Blood Today</button>` : ''}
            <button class="btn btn-delete" onclick="deleteDonor(${user.id})">🗑️ Permanently Delete My Account</button>
        </div>
        <button class="btn btn-logout" onclick="logout()">🚪 Logout</button>
    `;
}

function logout() {
    switchView('search');
}

function markDonated(id) {
    if (confirm("Confirm that you donated blood today? This will start your 90-day cooldown.")) {
        let donors = JSON.parse(localStorage.getItem('donors')) || [];
        let index = donors.findIndex(d => d.id === id);
        
        if(index !== -1) {
            donors[index].donations += 1; 
            donors[index].lastDonated = Date.now(); 
            localStorage.setItem('donors', JSON.stringify(donors));
            renderDashboard(id); 
        }
    }
}

function deleteDonor(id) {
    if (confirm("Are you 100% sure you want to permanently delete your account?")) {
        let donors = JSON.parse(localStorage.getItem('donors')) || [];
        donors = donors.filter(d => d.id !== id);
        localStorage.setItem('donors', JSON.stringify(donors));
        alert("Account deleted successfully.");
        logout(); 
    }
}
