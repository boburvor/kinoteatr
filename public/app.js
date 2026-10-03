/**
 * CineBook Frontend Application
 * Interaktiv kinoteatr chiptalarini band qilish & Admin boshqaruv mijozi
 */

class CineBookApp {
  constructor() {
    this.token = localStorage.getItem('cinebook_token') || null;
    this.currentUser = null;
    this.movies = [];
    this.currentGenre = '';
    this.searchQuery = '';
    
    // Modal va seans holati
    this.currentMovie = null;
    this.currentSessions = [];
    this.selectedSessionId = null;
    this.currentSeatsData = null;
    this.selectedSeats = []; // [{ row, seat }]

    // Mening chiptalarim
    this.myBookings = [];

    // Admin holati
    this.adminStats = null;
    this.adminSessions = [];
    this.adminBookings = [];
    this.adminUsers = [];
    this.adminMonitorSessionId = null;
    this.adminBookingSearch = '';

    // Narx (so'mda)
    this.TICKET_PRICE = 50000;

    this.init();
  }

  async init() {
    // Demo dropdown tinglovchisi
    const demoToggle = document.getElementById('demo-toggle-btn');
    const demoDropdown = document.getElementById('demo-dropdown');
    if (demoToggle && demoDropdown) {
      demoToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        demoDropdown.classList.toggle('show');
      });
      document.addEventListener('click', () => {
        demoDropdown.classList.remove('show');
      });
    }

    // Foydalanuvchini tekshirish
    if (this.token) {
      await this.fetchCurrentUser();
    } else {
      this.updateAuthUI();
    }

    // Filmlarni yuklash
    await this.loadMovies();
  }

  /* ==================== API HELPER ==================== */
  async api(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data && data.error ? data.error : `Xatolik: status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  /* ==================== AUTHENTICATION ==================== */
  async fetchCurrentUser() {
    try {
      const user = await this.api('/auth/me');
      this.currentUser = user;
      this.updateAuthUI();
      this.loadMyBookings();
    } catch (err) {
      console.warn("Foydalanuvchi sessiyasi eskirgan yoki yaroqsiz:", err.message);
      this.logout(false);
    }
  }

  updateAuthUI() {
    const guestControls = document.getElementById('guest-controls');
    const userControls = document.getElementById('user-controls');
    const navUserName = document.getElementById('nav-user-name');
    const navUserRole = document.getElementById('nav-user-role');
    const navUserAvatar = document.getElementById('nav-user-avatar');
    const adminActionsBar = document.getElementById('admin-actions-bar');
    const navAdminBtn = document.getElementById('nav-admin-btn');
    const bookingsAuthRequired = document.getElementById('bookings-auth-required');

    if (this.currentUser) {
      guestControls.style.display = 'none';
      userControls.style.display = 'flex';
      
      navUserName.textContent = this.currentUser.name;
      navUserRole.textContent = this.currentUser.role === 'admin' ? '🛡️ Admin' : 'Foydalanuvchi';
      navUserAvatar.textContent = (this.currentUser.name || 'U')[0].toUpperCase();
      
      if (this.currentUser.role === 'admin') {
        if (adminActionsBar) adminActionsBar.style.display = 'block';
        if (navAdminBtn) navAdminBtn.style.display = 'inline-flex';
      } else {
        if (adminActionsBar) adminActionsBar.style.display = 'none';
        if (navAdminBtn) navAdminBtn.style.display = 'none';
      }

      if (bookingsAuthRequired) bookingsAuthRequired.style.display = 'none';
    } else {
      guestControls.style.display = 'flex';
      userControls.style.display = 'none';
      if (adminActionsBar) adminActionsBar.style.display = 'none';
      if (navAdminBtn) navAdminBtn.style.display = 'none';
      
      const countBadge = document.getElementById('my-bookings-count');
      if (countBadge) countBadge.style.display = 'none';
    }
  }

  async quickLogin(userType) {
    let email = '';
    let password = '';

    if (userType === 'ali') {
      email = 'ali@example.com';
      password = 'password123';
    } else if (userType === 'vali') {
      email = 'vali@example.com';
      password = 'password123';
    } else if (userType === 'admin') {
      email = 'admin@cinebook.uz';
      password = 'Admin123!';
    }

    try {
      this.showToast(`Kirish amalga oshirilmoqda: ${email}...`, 'info');
      const res = await this.api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      this.token = res.token;
      this.currentUser = res.user;
      localStorage.setItem('cinebook_token', res.token);
      
      this.updateAuthUI();
      this.loadMyBookings();
      this.showToast(`Xush kelibsiz, ${res.user.name}!`, 'success');
      
      const demoDropdown = document.getElementById('demo-dropdown');
      if (demoDropdown) demoDropdown.classList.remove('show');

      // Agar admin bo'lsa va admin sahifasida tursa
      if (this.currentUser.role === 'admin') {
        this.loadAdminData();
      }
    } catch (err) {
      if (userType === 'ali' || userType === 'vali') {
        try {
          const name = userType === 'ali' ? 'Ali Valiyev' : 'Vali Aliyev';
          await this.api('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
          });
          const res = await this.api('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
          });
          this.token = res.token;
          this.currentUser = res.user;
          localStorage.setItem('cinebook_token', res.token);
          this.updateAuthUI();
          this.loadMyBookings();
          this.showToast(`Foydalanuvchi yaratildi va kirdi: ${res.user.name}!`, 'success');
          return;
        } catch (regErr) {
          this.showToast(regErr.message, 'error');
        }
      }
      this.showToast(err.message, 'error');
    }
  }

  fillAuth(userType) {
    if (userType === 'ali') {
      document.getElementById('login-email').value = 'ali@example.com';
      document.getElementById('login-password').value = 'password123';
    } else if (userType === 'vali') {
      document.getElementById('login-email').value = 'vali@example.com';
      document.getElementById('login-password').value = 'password123';
    } else if (userType === 'admin') {
      document.getElementById('login-email').value = 'admin@cinebook.uz';
      document.getElementById('login-password').value = 'Admin123!';
    }
  }

  logout(showNotification = true) {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('cinebook_token');
    this.myBookings = [];
    this.updateAuthUI();
    this.renderBookings();
    this.showSection('movies');
    if (showNotification) {
      this.showToast("Tizimdan muvaffaqiyatli chiqildi", 'info');
    }
  }

  openAuthModal(tab = 'login') {
    this.switchAuthTab(tab);
    document.getElementById('auth-modal').style.display = 'flex';
  }

  closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
    this.clearAuthErrors();
  }

  switchAuthTab(tab) {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('login-form');
    const formRegister = document.getElementById('register-form');
    const modalTitle = document.getElementById('auth-modal-title');

    this.clearAuthErrors();

    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.style.display = 'block';
      formRegister.style.display = 'none';
      modalTitle.textContent = "Tizimga kirish";
    } else {
      tabLogin.classList.remove('active');
      tabRegister.classList.add('active');
      formLogin.style.display = 'none';
      formRegister.style.display = 'block';
      modalTitle.textContent = "Yangi hisob yaratish";
    }
  }

  clearAuthErrors() {
    const lErr = document.getElementById('login-error');
    const rErr = document.getElementById('register-error');
    if (lErr) lErr.style.display = 'none';
    if (rErr) rErr.style.display = 'none';
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errBox = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit-btn');

    errBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = "Kutilmoqda...";

    try {
      const res = await this.api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      this.token = res.token;
      this.currentUser = res.user;
      localStorage.setItem('cinebook_token', res.token);

      this.updateAuthUI();
      this.closeAuthModal();
      this.loadMyBookings();
      this.showToast(`Xush kelibsiz, ${res.user.name}!`, 'success');

      if (this.currentMovie && this.selectedSeats.length > 0) {
        this.updateCheckoutBar();
      }
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Kirish";
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const errBox = document.getElementById('register-error');
    const submitBtn = document.getElementById('register-submit-btn');

    errBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = "Ro'yxatdan o'tilmoqda...";

    try {
      await this.api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });

      this.showToast("Muvaffaqiyatli ro'yxatdan o'tdingiz!", 'success');

      const loginRes = await this.api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      this.token = loginRes.token;
      this.currentUser = loginRes.user;
      localStorage.setItem('cinebook_token', loginRes.token);

      this.updateAuthUI();
      this.closeAuthModal();
      this.loadMyBookings();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Ro'yxatdan o'tish";
    }
  }

  /* ==================== FILMLAR ==================== */
  async loadMovies() {
    try {
      const res = await this.api('/movies');
      this.movies = res.data || [];
      this.renderMovies();
    } catch (err) {
      this.showToast("Filmlarni yuklashda xatolik yuz berdi: " + err.message, 'error');
    }
  }

  setGenreFilter(genre) {
    this.currentGenre = genre;
    const chips = document.querySelectorAll('.genre-chip');
    chips.forEach(chip => {
      if (chip.getAttribute('data-genre') === genre) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
    this.renderMovies();
  }

  filterMovies() {
    const input = document.getElementById('movie-search');
    this.searchQuery = input.value.trim().toLowerCase();
    this.renderMovies();
  }

  renderMovies() {
    const container = document.getElementById('movies-container');
    const countBadge = document.getElementById('movies-count-badge');
    if (!container) return;

    let filtered = this.movies;

    if (this.currentGenre) {
      filtered = filtered.filter(m => m.genre && m.genre.toLowerCase() === this.currentGenre.toLowerCase());
    }

    if (this.searchQuery) {
      filtered = filtered.filter(m => 
        (m.title && m.title.toLowerCase().includes(this.searchQuery)) ||
        (m.description && m.description.toLowerCase().includes(this.searchQuery))
      );
    }

    countBadge.textContent = `${filtered.length} ta film`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-box" style="grid-column: 1 / -1;">
          <div class="empty-icon">🔍</div>
          <h3>Film topilmadi</h3>
          <p>Qidiruv so'rovi yoki tanlangan janr bo'yicha hozircha filmlar yo'q.</p>
          <button class="btn btn-outline" onclick="app.setGenreFilter(''); document.getElementById('movie-search').value=''; app.filterMovies();">Barcha filmlarni ko'rsatish</button>
        </div>
      `;
      return;
    }

    const themeMap = {
      1: 'poster-theme-1',
      2: 'poster-theme-2',
      3: 'poster-theme-3',
      4: 'poster-theme-4',
    };

    const iconMap = {
      1: '🌀',
      2: '🦇',
      3: '🚀',
      4: '⚔️'
    };

    container.innerHTML = filtered.map(movie => {
      const themeClass = themeMap[movie.id] || 'poster-theme-default';
      const icon = iconMap[movie.id] || '🎬';

      return `
        <div class="movie-card">
          <div class="movie-poster-banner ${themeClass}">
            <div class="poster-top-tags">
              <span class="film-genre-tag">${movie.genre || 'kino'}</span>
              <span class="film-duration-tag">⏱️ ${movie.duration} daqiqa</span>
            </div>
            <div class="poster-art-center">${icon}</div>
          </div>
          <div class="movie-card-body">
            <h3 class="movie-card-title">${movie.title}</h3>
            <p class="movie-card-desc">${movie.description || "Ushbu film uchun batafsil tavsif mavjud emas."}</p>
            <button class="btn btn-primary btn-block" onclick="app.openSeatModal(${movie.id})">
              🎟️ Joy Tanlash va Band Qilish
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ==================== SEAT MODAL VA BAND QILISH ==================== */
  async openSeatModal(movieId) {
    try {
      this.selectedSeats = [];
      const movieRes = await this.api(`/movies/${movieId}`);
      this.currentMovie = movieRes;
      this.currentSessions = movieRes.sessions || [];

      if (this.currentSessions.length === 0) {
        this.showToast("Ushbu film uchun hozircha faol seanslar mavjud emas.", 'info');
        return;
      }

      this.selectedSessionId = this.currentSessions[0].id;

      document.getElementById('modal-movie-title').textContent = this.currentMovie.title;
      document.getElementById('modal-movie-genre').textContent = this.currentMovie.genre || 'Kino';
      document.getElementById('modal-movie-meta').textContent = `Davomiyligi: ${this.currentMovie.duration} daqiqa`;

      this.renderSessionPills();
      await this.loadAndRenderSeats(this.selectedSessionId);

      document.getElementById('seat-modal').style.display = 'flex';
    } catch (err) {
      this.showToast("Film ma'lumotlarini yuklashda xatolik: " + err.message, 'error');
    }
  }

  closeSeatModal() {
    document.getElementById('seat-modal').style.display = 'none';
    this.currentMovie = null;
    this.currentSessions = [];
    this.selectedSessionId = null;
    this.selectedSeats = [];
  }

  renderSessionPills() {
    const container = document.getElementById('modal-session-pills');
    if (!container) return;

    container.innerHTML = this.currentSessions.map(session => {
      const activeClass = session.id === this.selectedSessionId ? 'active' : '';
      const timeStr = session.time ? session.time.replace('T', ' ') : 'Vaqt belgilanmagan';
      return `
        <button class="session-pill-btn ${activeClass}" onclick="app.selectSession(${session.id})">
          <span>🕒 ${timeStr}</span>
          <span class="session-hall">(${session.hall}-zal)</span>
        </button>
      `;
    }).join('');
  }

  async selectSession(sessionId) {
    this.selectedSessionId = sessionId;
    this.selectedSeats = [];
    this.renderSessionPills();
    await this.loadAndRenderSeats(sessionId);
  }

  async loadAndRenderSeats(sessionId) {
    try {
      const data = await this.api(`/sessions/${sessionId}/seats`);
      this.currentSeatsData = data;

      document.getElementById('hall-name').textContent = `${data.hall}-zal`;
      document.getElementById('session-time').textContent = data.time ? data.time.replace('T', ' ') : '';
      document.getElementById('hall-available-count').textContent = `${data.availableCount} / ${data.totalSeats}`;

      this.renderSeatsGrid(data);
      this.updateCheckoutBar();
    } catch (err) {
      this.showToast("O'rindiqlar xaritasini yuklashda xatolik: " + err.message, 'error');
    }
  }

  renderSeatsGrid(data) {
    const gridContainer = document.getElementById('seats-grid');
    if (!gridContainer) return;

    const { rows, seatsPerRow, seats } = data;
    let html = '';

    for (let r = 1; r <= rows; r++) {
      html += `<div class="seat-row">`;
      html += `<span class="row-label">Q${r}</span>`;
      html += `<div class="row-seats">`;

      for (let s = 1; s <= seatsPerRow; s++) {
        const seatObj = seats.find(item => item.row === r && item.seat === s);
        const isTaken = seatObj ? seatObj.taken : false;
        const isSelected = this.selectedSeats.some(item => item.row === r && item.seat === s);

        let btnClass = 'seat-btn';
        if (isTaken) btnClass += ' taken';
        else if (isSelected) btnClass += ' selected';

        const title = isTaken 
          ? `Qator ${r}, Joy ${s} (Band qilingan)` 
          : `Qator ${r}, Joy ${s} (Bo'sh)`;

        html += `
          <button 
            type="button" 
            class="${btnClass}" 
            title="${title}"
            ${isTaken ? 'disabled' : ''}
            onclick="app.toggleSeatSelection(${r}, ${s})"
          >
            ${isTaken ? '' : s}
          </button>
        `;
      }

      html += `</div>`;
      html += `</div>`;
    }

    gridContainer.innerHTML = html;
  }

  toggleSeatSelection(row, seat) {
    const existingIndex = this.selectedSeats.findIndex(item => item.row === row && item.seat === seat);

    if (existingIndex > -1) {
      this.selectedSeats.splice(existingIndex, 1);
    } else {
      if (this.selectedSeats.length >= 4) {
        this.showToast("Bitta seans uchun ko'pi bilan 4 ta joy band qila olasiz!", 'error');
        return;
      }
      this.selectedSeats.push({ row, seat });
    }

    this.renderSeatsGrid(this.currentSeatsData);
    this.updateCheckoutBar();
  }

  updateCheckoutBar() {
    const chipsContainer = document.getElementById('selected-seats-chips');
    const totalPriceEl = document.getElementById('total-price');
    const confirmBtn = document.getElementById('confirm-booking-btn');

    if (this.selectedSeats.length === 0) {
      chipsContainer.innerHTML = '<span class="no-selection-text">O\'rindiq tanlanmadi</span>';
      totalPriceEl.textContent = '0 so\'m';
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Joyni Band Qilish";
      return;
    }

    chipsContainer.innerHTML = this.selectedSeats.map(item => `
      <span class="seat-tag">
        Q${item.row} : J${item.seat}
      </span>
    `).join('');

    const total = this.selectedSeats.length * this.TICKET_PRICE;
    totalPriceEl.textContent = `${total.toLocaleString()} so'm`;

    confirmBtn.disabled = false;
    if (!this.currentUser) {
      confirmBtn.textContent = "Kirish & Band Qilish";
    } else {
      confirmBtn.textContent = `Band Qilish (${this.selectedSeats.length} ta joy)`;
    }
  }

  async confirmBooking() {
    if (!this.currentUser) {
      this.showToast("Iltimos, joy band qilishdan oldin tizimga kiring.", 'info');
      this.openAuthModal('login');
      return;
    }

    if (this.selectedSeats.length === 0) {
      this.showToast("Iltimos, avval o'rindiqni tanlang.", 'info');
      return;
    }

    const confirmBtn = document.getElementById('confirm-booking-btn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Band qilinmoqda...";

    let successCount = 0;
    let errors = [];

    for (const seat of this.selectedSeats) {
      try {
        await this.api('/bookings', {
          method: 'POST',
          body: JSON.stringify({
            sessionId: this.selectedSessionId,
            row: seat.row,
            seat: seat.seat
          })
        });
        successCount++;
      } catch (err) {
        errors.push(`Qator ${seat.row}, Joy ${seat.seat}: ${err.message}`);
      }
    }

    if (successCount > 0) {
      this.showToast(`🎉 ${successCount} ta joy muvaffaqiyatli band qilindi!`, 'success');
      this.selectedSeats = [];
      await this.loadAndRenderSeats(this.selectedSessionId);
      await this.loadMyBookings();
    }

    if (errors.length > 0) {
      this.showToast(errors.join('\n'), 'error');
    }

    confirmBtn.disabled = false;
    this.updateCheckoutBar();
  }

  /* ==================== MENING CHIPTALARIM ==================== */
  async loadMyBookings() {
    if (!this.currentUser) return;

    try {
      const data = await this.api('/bookings/my');
      this.myBookings = data || [];
      this.renderBookings();

      const countBadge = document.getElementById('my-bookings-count');
      if (countBadge) {
        countBadge.textContent = this.myBookings.length;
        countBadge.style.display = this.myBookings.length > 0 ? 'inline-block' : 'none';
      }
    } catch (err) {
      console.error("Mening bandlarimni olishda xatolik:", err);
    }
  }

  renderBookings() {
    const container = document.getElementById('bookings-container');
    const emptyBox = document.getElementById('bookings-empty');
    const authBox = document.getElementById('bookings-auth-required');
    const countBadge = document.getElementById('bookings-count-badge');

    if (!container) return;

    if (!this.currentUser) {
      authBox.style.display = 'block';
      emptyBox.style.display = 'none';
      container.innerHTML = '';
      countBadge.textContent = '0 ta chipta';
      return;
    }

    authBox.style.display = 'none';
    countBadge.textContent = `${this.myBookings.length} ta chipta`;

    if (this.myBookings.length === 0) {
      emptyBox.style.display = 'block';
      container.innerHTML = '';
      return;
    }

    emptyBox.style.display = 'none';

    container.innerHTML = this.myBookings.map(item => {
      const movieTitle = item.session && item.session.movie ? item.session.movie.title : "Film";
      const movieGenre = item.session && item.session.movie ? item.session.movie.genre : "Kino";
      const hall = item.session ? `${item.session.hall}-zal` : 'Standart zal';
      const time = item.session && item.session.time ? item.session.time.replace('T', ' ') : 'Belgilanmagan';
      const createdDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString('uz-UZ') : '';

      return `
        <div class="ticket-card" id="ticket-${item.id}">
          <div class="ticket-header">
            <div class="ticket-genre-badge">${movieGenre}</div>
            <h3 class="ticket-movie-title">${movieTitle}</h3>
          </div>
          <div class="ticket-body">
            <div class="ticket-seat-highlight">
              <div class="seat-row-col">Qator ${item.row} • Joy ${item.seat}</div>
              <div class="seat-sub">Band qilingan o'rindiq</div>
            </div>
            <div class="ticket-details-grid">
              <div class="detail-item">
                <span class="detail-label">Kinoteatr Zali</span>
                <span class="detail-val">${hall}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Seans Vaqti</span>
                <span class="detail-val">${time}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Chipta ID</span>
                <span class="detail-val">#BK-${item.id.toString().padStart(4, '0')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Sana</span>
                <span class="detail-val">${createdDate}</span>
              </div>
            </div>
          </div>
          <div class="ticket-footer">
            <span class="barcode-stub">||| | |||| | |||</span>
            <button class="btn-cancel-ticket" onclick="app.cancelBooking(${item.id})">
              Bekor Qilish
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  async cancelBooking(bookingId) {
    if (!confirm("Haqiqatan ham ushbu chiptani bekor qilmoqchimisiz? Joy boshqa foydalanuvchilar uchun ochiladi.")) {
      return;
    }

    try {
      await this.api(`/bookings/${bookingId}`, {
        method: 'DELETE'
      });

      this.showToast("Chipta muvaffaqiyatli bekor qilindi", 'success');
      await this.loadMyBookings();

      if (this.currentMovie && this.selectedSessionId) {
        await this.loadAndRenderSeats(this.selectedSessionId);
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  /* ==================== ADMIN: BOSHQARUV MARKAZI ==================== */
  async loadAdminData() {
    if (!this.currentUser || this.currentUser.role !== 'admin') return;

    try {
      // 1. KPI Stats
      const stats = await this.api('/admin/stats');
      this.adminStats = stats;
      document.getElementById('kpi-movies').textContent = stats.totalMovies;
      document.getElementById('kpi-sessions').textContent = stats.totalSessions;
      document.getElementById('kpi-bookings').textContent = stats.totalBookings;
      document.getElementById('kpi-revenue').textContent = `${stats.totalRevenue.toLocaleString()} so'm`;
      document.getElementById('kpi-users').textContent = stats.totalUsers;
      document.getElementById('kpi-occupancy').textContent = `${stats.occupancyRate}%`;

      // 2. Filmlar jadvali
      this.renderAdminMoviesTable();

      // 3. Seanslar jadvali
      await this.loadAdminSessions();

      // 4. Barcha chiptalar jadvali
      await this.loadAdminBookings();

      // 5. Foydalanuvchilar
      await this.loadAdminUsers();

      // 6. Monitor uchun seanslarni to'ldirish
      this.populateMonitorSelect();
    } catch (err) {
      console.error("Admin ma'lumotlarini yuklashda xatolik:", err);
    }
  }

  switchAdminTab(tabName) {
    const tabs = ['movies', 'sessions', 'bookings', 'monitor', 'users'];
    tabs.forEach(t => {
      const btn = document.getElementById(`atab-${t}`);
      const pane = document.getElementById(`admin-view-${t}`);
      if (btn && pane) {
        if (t === tabName) {
          btn.classList.add('active');
          pane.style.display = 'block';
        } else {
          btn.classList.remove('active');
          pane.style.display = 'none';
        }
      }
    });

    if (tabName === 'monitor') {
      const select = document.getElementById('admin-monitor-session-select');
      if (select && select.value) {
        this.loadAdminMonitorSession(select.value);
      }
    }
  }

  renderAdminMoviesTable() {
    const tbody = document.getElementById('admin-movies-tbody');
    const countEl = document.getElementById('admin-movies-count');
    if (!tbody) return;

    if (countEl) countEl.textContent = this.movies.length;

    tbody.innerHTML = this.movies.map(m => `
      <tr>
        <td><strong>#${m.id}</strong></td>
        <td><strong>${m.title}</strong></td>
        <td><span class="film-genre-tag">${m.genre}</span></td>
        <td>⏱️ ${m.duration} daqiqa</td>
        <td style="max-width: 250px; font-size: 0.8rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
          ${m.description || '—'}
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-action-sm" onclick="app.openAddSessionModal(${m.id})">
              + Seans
            </button>
            <button class="btn-danger-sm" onclick="app.deleteMovie(${m.id}, '${m.title.replace(/'/g, "\\'")}')">
              🗑️ O'chirish
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  async loadAdminSessions() {
    try {
      const sessions = await this.api('/sessions');
      this.adminSessions = sessions || [];
      const tbody = document.getElementById('admin-sessions-tbody');
      const countEl = document.getElementById('admin-sessions-count');
      if (countEl) countEl.textContent = this.adminSessions.length;

      if (!tbody) return;

      tbody.innerHTML = this.adminSessions.map(s => {
        const timeStr = s.time ? s.time.replace('T', ' ') : '—';
        return `
          <tr>
            <td><strong>#${s.id}</strong></td>
            <td><strong>${s.movieTitle}</strong></td>
            <td><span class="badge-hall">${s.hall}-zal</span></td>
            <td>🕒 ${timeStr}</td>
            <td>${s.rows} qator × ${s.seatsPerRow} o'rin (${s.totalSeats} ta)</td>
            <td>
              <strong class="text-amber">${s.bookedCount} band</strong> / 
              <span class="text-success">${s.availableCount} bo'sh</span>
            </td>
            <td>
              <div class="table-actions">
                <button class="btn-action-sm" onclick="app.inspectSessionInMonitor(${s.id})">
                  👁️ Zalni Ko'rish
                </button>
                <button class="btn-danger-sm" onclick="app.deleteSession(${s.id})">
                  🗑️ O'chirish
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error("Admin seanslarni yuklashda xatolik:", err);
    }
  }

  async loadAdminBookings() {
    try {
      const bookings = await this.api('/admin/bookings');
      this.adminBookings = bookings || [];
      this.renderAdminBookingsTable();
    } catch (err) {
      console.error("Admin barcha bandlarni olishda xatolik:", err);
    }
  }

  filterAdminBookings() {
    const input = document.getElementById('admin-booking-search');
    this.adminBookingSearch = input ? input.value.trim().toLowerCase() : '';
    this.renderAdminBookingsTable();
  }

  renderAdminBookingsTable() {
    const tbody = document.getElementById('admin-bookings-tbody');
    const countEl = document.getElementById('admin-bookings-count');
    if (!tbody) return;

    let filtered = this.adminBookings;
    if (this.adminBookingSearch) {
      filtered = filtered.filter(b => {
        const uName = b.user ? b.user.name.toLowerCase() : '';
        const uEmail = b.user ? b.user.email.toLowerCase() : '';
        const mTitle = b.movie ? b.movie.title.toLowerCase() : '';
        return uName.includes(this.adminBookingSearch) || 
               uEmail.includes(this.adminBookingSearch) || 
               mTitle.includes(this.adminBookingSearch);
      });
    }

    if (countEl) countEl.textContent = filtered.length;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2rem;">Chiptalar topilmadi</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(b => {
      const userName = b.user ? b.user.name : "Noma'lum";
      const userEmail = b.user ? b.user.email : "";
      const movieTitle = b.movie ? b.movie.title : "Film";
      const hall = b.session ? `${b.session.hall}-zal` : '—';
      const time = b.session && b.session.time ? b.session.time.replace('T', ' ') : '—';
      const createdDate = b.createdAt ? new Date(b.createdAt).toLocaleString('uz-UZ') : '';

      return `
        <tr>
          <td><strong>#BK-${b.id.toString().padStart(4, '0')}</strong></td>
          <td>
            <strong>${userName}</strong>
            <br><small style="color: var(--text-dim);">${userEmail}</small>
          </td>
          <td><strong>${movieTitle}</strong></td>
          <td>${hall} • 🕒 ${time}</td>
          <td><strong style="color: #fbbf24;">Q${b.row} : J${b.seat}</strong></td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">${createdDate}</td>
          <td>
            <button class="btn-danger-sm" onclick="app.adminDeleteBooking(${b.id}, '${userName}', ${b.row}, ${b.seat})">
              Bekor Qilish
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async adminDeleteBooking(bookingId, userName, row, seat) {
    if (!confirm(`Haqiqatan ham #${bookingId} raqamli chiptani (${userName} - Qator ${row}, Joy ${seat}) bekor qilmoqchimisiz?`)) {
      return;
    }

    try {
      await this.api(`/bookings/${bookingId}`, { method: 'DELETE' });
      this.showToast(`Chipta #${bookingId} muvaffaqiyatli bekor qilindi`, 'success');
      await this.loadAdminData();
      if (this.adminMonitorSessionId) {
        await this.loadAdminMonitorSession(this.adminMonitorSessionId);
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async loadAdminUsers() {
    try {
      const users = await this.api('/admin/users');
      this.adminUsers = users || [];
      const tbody = document.getElementById('admin-users-tbody');
      const countEl = document.getElementById('admin-users-count');
      if (countEl) countEl.textContent = this.adminUsers.length;

      if (!tbody) return;

      tbody.innerHTML = this.adminUsers.map(u => {
        const isAdm = u.role === 'admin';
        const roleBadge = isAdm ? `<span class="admin-badge badge-admin">Admin</span>` : `<span class="admin-badge badge-user">Foydalanuvchi</span>`;
        const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString('uz-UZ') : '—';

        return `
          <tr>
            <td><strong>#${u.id}</strong></td>
            <td><strong>${u.name}</strong></td>
            <td>${u.email}</td>
            <td>${roleBadge}</td>
            <td><strong class="text-amber">${u.bookingsCount} ta chipta</strong></td>
            <td style="font-size: 0.8rem; color: var(--text-dim);">${dateStr}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error("Admin foydalanuvchilarni olishda xatolik:", err);
    }
  }

  populateMonitorSelect() {
    const select = document.getElementById('admin-monitor-session-select');
    if (!select) return;

    select.innerHTML = this.adminSessions.map(s => `
      <option value="${s.id}">#${s.id} - ${s.movieTitle} (${s.hall}-zal, ${s.time ? s.time.replace('T', ' ') : ''})</option>
    `).join('');

    if (this.adminSessions.length > 0 && !this.adminMonitorSessionId) {
      this.adminMonitorSessionId = this.adminSessions[0].id;
      this.loadAdminMonitorSession(this.adminMonitorSessionId);
    }
  }

  inspectSessionInMonitor(sessionId) {
    this.switchAdminTab('monitor');
    const select = document.getElementById('admin-monitor-session-select');
    if (select) select.value = sessionId;
    this.loadAdminMonitorSession(sessionId);
  }

  async refreshAdminMonitor() {
    const select = document.getElementById('admin-monitor-session-select');
    if (select && select.value) {
      await this.loadAdminMonitorSession(select.value);
      this.showToast("Zal ma'lumotlari yangilandi", 'info');
    }
  }

  async loadAdminMonitorSession(sessionId) {
    this.adminMonitorSessionId = sessionId;
    const area = document.getElementById('admin-monitor-hall-area');
    if (!area) return;

    try {
      const data = await this.api(`/sessions/${sessionId}/seats`);
      const { rows, seatsPerRow, seats, hall, time, bookedCount, availableCount, totalSeats } = data;

      let seatsHtml = '';
      for (let r = 1; r <= rows; r++) {
        seatsHtml += `<div class="seat-row">`;
        seatsHtml += `<span class="row-label">Q${r}</span>`;
        seatsHtml += `<div class="row-seats">`;

        for (let s = 1; s <= seatsPerRow; s++) {
          const seatObj = seats.find(item => item.row === r && item.seat === s);
          const isTaken = seatObj ? seatObj.taken : false;

          let btnClass = 'seat-btn';
          let tooltip = `Qator ${r}, Joy ${s} (Bo'sh)`;
          let clickAction = `app.adminBookSeatPrompt(${sessionId}, ${r}, ${s})`;

          if (isTaken) {
            btnClass += ' admin-taken';
            tooltip = `Qator ${r}, Joy ${s} - Band qilgan: ${seatObj.bookedByName} (${seatObj.bookedByEmail}) [Bekor qilish uchun bosing]`;
            clickAction = `app.adminDeleteBooking(${seatObj.bookingId}, '${seatObj.bookedByName}', ${r}, ${s})`;
          }

          seatsHtml += `
            <button 
              type="button" 
              class="${btnClass}" 
              title="${tooltip}"
              onclick="${clickAction}"
            >
              ${isTaken ? '✕' : s}
            </button>
          `;
        }

        seatsHtml += `</div>`;
        seatsHtml += `</div>`;
      }

      area.innerHTML = `
        <div class="monitor-session-info-bar">
          <div>
            <strong>Zal: <span class="badge-hall">${hall}-zal</span></strong>
            <span style="margin: 0 0.5rem;">•</span>
            <span>Vaqt: <strong>${time ? time.replace('T', ' ') : ''}</strong></span>
          </div>
          <div>
            <span>Bandlik: <strong class="text-amber">${bookedCount} ta</strong></span>
            <span style="margin: 0 0.5rem;">•</span>
            <span>Bo'sh: <strong class="text-success">${availableCount} ta</strong> (Jami: ${totalSeats})</span>
          </div>
        </div>

        <div class="admin-seat-legend-bar">
          <div class="legend-item">
            <span class="seat-sample seat-available"></span>
            <span>Bo'sh (Ma'muriyat tomonidan band qilish mumkin)</span>
          </div>
          <div class="legend-item">
            <span class="seat-sample seat-taken"></span>
            <span>Band qilingan (Bekor qilish uchun ustiga bosing)</span>
          </div>
        </div>

        <div class="screen-container">
          <div class="screen-curve"></div>
          <div class="screen-glow"></div>
          <span class="screen-text">EKRAN</span>
        </div>

        <div class="hall-grid-wrapper">
          <div class="hall-grid">
            ${seatsHtml}
          </div>
        </div>
      `;
    } catch (err) {
      area.innerHTML = `<div class="form-error">Zal ma'lumotlarini yuklashda xatolik: ${err.message}</div>`;
    }
  }

  async adminBookSeatPrompt(sessionId, row, seat) {
    if (!confirm(`Ushbu joyni (Qator ${row}, Joy ${seat}) ma'muriyat hisobidan band qilmoqchimisiz?`)) {
      return;
    }

    try {
      await this.api('/bookings', {
        method: 'POST',
        body: JSON.stringify({ sessionId, row, seat })
      });
      this.showToast(`Qator ${row}, Joy ${seat} muvaffaqiyatli band qilindi`, 'success');
      await this.loadAdminData();
      await this.loadAdminMonitorSession(sessionId);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async deleteMovie(movieId, title) {
    if (!confirm(`Haqiqatan ham "${title}" filmini o'chirmoqchimisiz? Film bilan birga uning barcha seanslari va chiptalari ham o'chiriladi.`)) {
      return;
    }

    try {
      const res = await this.api(`/movies/${movieId}`, { method: 'DELETE' });
      this.showToast(res.message, 'success');
      await this.loadMovies();
      await this.loadAdminData();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async deleteSession(sessionId) {
    if (!confirm(`Haqiqatan ham #${sessionId} seansni o'chirmoqchimisiz? Seansdagi barcha band qilingan joylar ham bekor qilinadi.`)) {
      return;
    }

    try {
      const res = await this.api(`/sessions/${sessionId}`, { method: 'DELETE' });
      this.showToast(res.message, 'success');
      await this.loadAdminData();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  openAddMovieModal() {
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      this.showToast("Bu amal faqat adminlar uchun ruxsat etilgan!", 'error');
      return;
    }
    document.getElementById('admin-movie-modal').style.display = 'flex';
  }

  closeAddMovieModal() {
    document.getElementById('admin-movie-modal').style.display = 'none';
    const errBox = document.getElementById('admin-movie-error');
    if (errBox) errBox.style.display = 'none';
  }

  async handleAddMovie(e) {
    e.preventDefault();
    const title = document.getElementById('new-movie-title').value.trim();
    const genre = document.getElementById('new-movie-genre').value.trim();
    const duration = document.getElementById('new-movie-duration').value;
    const description = document.getElementById('new-movie-desc').value.trim();
    const errBox = document.getElementById('admin-movie-error');
    const btn = document.getElementById('add-movie-btn');

    errBox.style.display = 'none';
    btn.disabled = true;
    btn.textContent = "Qo'shilmoqda...";

    try {
      const res = await this.api('/movies', {
        method: 'POST',
        body: JSON.stringify({ title, genre, duration, description })
      });

      this.showToast(`"${res.movie.title}" muvaffaqiyatli qo'shildi!`, 'success');
      this.closeAddMovieModal();
      document.getElementById('add-movie-form').reset();
      await this.loadMovies();
      await this.loadAdminData();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = "Film Qo'shish";
    }
  }

  openAddSessionModal(preselectedMovieId = null) {
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      this.showToast("Bu amal faqat adminlar uchun ruxsat etilgan!", 'error');
      return;
    }

    const movieSelect = document.getElementById('new-session-movie-id');
    if (movieSelect) {
      movieSelect.innerHTML = this.movies.map(m => `
        <option value="${m.id}" ${preselectedMovieId && preselectedMovieId === m.id ? 'selected' : ''}>
          ${m.title} (${m.genre}, ${m.duration} daqiqa)
        </option>
      `).join('');
    }

    // Default datetime
    const timeInput = document.getElementById('new-session-time');
    if (timeInput) {
      const now = new Date();
      now.setDate(now.getDate() + 1);
      now.setHours(19, 0, 0, 0);
      timeInput.value = now.toISOString().slice(0, 16);
    }

    document.getElementById('admin-session-modal').style.display = 'flex';
  }

  closeAddSessionModal() {
    document.getElementById('admin-session-modal').style.display = 'none';
    const errBox = document.getElementById('admin-session-error');
    if (errBox) errBox.style.display = 'none';
  }

  async handleAddSession(e) {
    e.preventDefault();
    const movieId = document.getElementById('new-session-movie-id').value;
    const hall = document.getElementById('new-session-hall').value;
    const time = document.getElementById('new-session-time').value;
    const rows = document.getElementById('new-session-rows').value;
    const seatsPerRow = document.getElementById('new-session-seats').value;
    const errBox = document.getElementById('admin-session-error');
    const btn = document.getElementById('add-session-btn');

    errBox.style.display = 'none';
    btn.disabled = true;
    btn.textContent = "Qo'shilmoqda...";

    try {
      const res = await this.api('/sessions', {
        method: 'POST',
        body: JSON.stringify({ movieId, hall, time, rows, seatsPerRow })
      });

      this.showToast(`Seans muvaffaqiyatli qo'shildi!`, 'success');
      this.closeAddSessionModal();
      document.getElementById('add-session-form').reset();
      await this.loadAdminData();
      await this.loadMovies();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = "Seansni Qo'shish";
    }
  }

  async resetDatabase() {
    if (!confirm("Diqqat! Ma'lumotlar bazasini boshlang'ich holatga qaytarmoqchimisiz? Barcha yangi band qilingan chiptalar va qo'shilgan filmlar o'chiriladi.")) {
      return;
    }

    try {
      const res = await this.api('/admin/reset', { method: 'POST' });
      this.showToast(res.message, 'success');
      await this.loadMovies();
      await this.loadAdminData();
      await this.loadMyBookings();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  /* ==================== SAHIFA NAVIGATSIYASI ==================== */
  showSection(sectionName) {
    const secMovies = document.getElementById('section-movies');
    const secBookings = document.getElementById('section-bookings');
    const secAdmin = document.getElementById('section-admin');
    const heroBanner = document.getElementById('hero-banner');

    const navMoviesBtn = document.getElementById('nav-movies-btn');
    const navBookingsBtn = document.getElementById('nav-bookings-btn');
    const navAdminBtn = document.getElementById('nav-admin-btn');

    // Tugmalarning active holatini tozalash
    navMoviesBtn.classList.remove('active');
    navBookingsBtn.classList.remove('active');
    if (navAdminBtn) navAdminBtn.classList.remove('active');

    // Bo'limlarni yashirish
    secMovies.style.display = 'none';
    secBookings.style.display = 'none';
    if (secAdmin) secAdmin.style.display = 'none';

    if (sectionName === 'movies') {
      secMovies.style.display = 'block';
      if (heroBanner) heroBanner.style.display = 'block';
      navMoviesBtn.classList.add('active');
    } else if (sectionName === 'bookings') {
      secBookings.style.display = 'block';
      if (heroBanner) heroBanner.style.display = 'none';
      navBookingsBtn.classList.add('active');
      this.loadMyBookings();
    } else if (sectionName === 'admin') {
      if (!this.currentUser || this.currentUser.role !== 'admin') {
        this.showToast("Admin paneliga kirish uchun admin hisobiga kiring!", 'error');
        this.openAuthModal('login');
        return;
      }
      if (secAdmin) secAdmin.style.display = 'block';
      if (heroBanner) heroBanner.style.display = 'none';
      if (navAdminBtn) navAdminBtn.classList.add('active');
      this.loadAdminData();
    }
  }

  /* ==================== TOAST XABARNOMALAR ==================== */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-msg">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Global ilova nusxasini ishga tushirish
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new CineBookApp();
  window.app = app;
});
