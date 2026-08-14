/**
 * 메인 페이지: 풀스크린 지도 + 우측 플로팅 패널(내 컬렉션/둘러보기)
 * 비로그인도 접근 가능, 컬렉션 생성/즐겨찾기 등 액션 시에만 로그인 요구
 */
$(function () {
    var user = wooji.getUser();
    var myCollections = [];
    var currentTab = 'my';
    var placeResults = [];      // 상단 장소 검색 결과
    var searchMarkers = [];
    var pendingPlace = null;    // "이 장소로 컬렉션 만들기"로 담아둔 장소

    var CATEGORY_ICON = {
        RESTAURANT: '🍽️', CAFE: '☕', SIGHT: '🏞️',
        HOTEL: '🏨', SHOP: '🛍️', PARKING: '🅿️', ETC: '📍'
    };

    emojiPicker.attach('#colEmoji');

    /* 패널 상단 사용자 영역 */
    if (user) {
        $('#userArea').html(
            '<span style="display:flex; align-items:center; gap:6px;">'
            + '<a href="/mypage" title="마이페이지" class="me-avatar"'
            + (user.profileImage ? ' style="background-image:url(\'' + wooji.escapeHtml(user.profileImage) + '\');"' : '') + '>'
            + (user.profileImage ? '' : wooji.escapeHtml((user.nickname || '?').charAt(0))) + '</a>'
            + '<button class="btn btn-sm" id="btnLogout">로그아웃</button></span>');
        $('#btnLogout').on('click', wooji.logout);
    } else {
        // 회원가입은 로그인 페이지에서 이동
        $('#userArea').html('<a href="/login" class="btn btn-sm btn-primary">로그인</a>');
    }

    // 모바일: 햄버거로 패널 토글
    function setMobilePanel(open) {
        $('.float-panel').toggleClass('open', open);
        $('#panelBackdrop').toggleClass('show', open);
        $('body').toggleClass('panel-open', open);   // 열리면 햄버거 숨김
    }
    $('#btnPanel').on('click', function () {
        setMobilePanel(!$('.float-panel').hasClass('open'));
    });
    $('#panelBackdrop').on('click', function () { setMobilePanel(false); });

    // 패널 접기(데스크톱) / 닫기(모바일)
    $('#btnCollapse').on('click', function () {
        if (window.innerWidth <= 768) {
            setMobilePanel(false);
            return;
        }
        $('.float-panel').addClass('hidden-panel');
        $('#btnRestore').addClass('show');
    });
    $('#btnRestore').on('click', function () {
        $('.float-panel').removeClass('hidden-panel');
        $(this).removeClass('show');
    });

    // 지도 (카카오)
    var mapAvailable = (typeof kakao !== 'undefined') && kakao.maps && kakao.maps.Map;
    var map = null;
    var mainInfoWindow = null;
    if (mapAvailable) {
        map = new kakao.maps.Map(document.getElementById('map'), {
            center: new kakao.maps.LatLng(37.5665, 126.9780),   // 서울시청
            level: 8
        });
        // 기본 InfoWindow는 테두리가 깨져 보여 CustomOverlay로 직접 그림
        mainInfoWindow = new kakao.maps.CustomOverlay({ yAnchor: 1.25, zIndex: 3, clickable: true });
        mainInfoWindow.close = function () { this.setMap(null); };

        // 이미 위치 권한이 허용된 경우에만 현재 위치로 이동 (허용창은 나침반 클릭 시에만)
        wooji.locateIfAllowed(function (pos) {
            map.setLevel(5);
            map.panTo(new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
        });
    } else {
        $('#map').html('<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--caption); font-size:14px; text-align:center;">'
            + '카카오 지도를 불러올 수 없습니다.<br>application.yml 의 kakao.map.js-key 설정을 확인해주세요.</div>');
    }

    /* 지도 컨트롤 */
    $('#btnZoomIn').on('click', function () { if (mapAvailable) map.setLevel(map.getLevel() - 1); });
    $('#btnZoomOut').on('click', function () { if (mapAvailable) map.setLevel(map.getLevel() + 1); });
    $('#btnMyLocation').on('click', function () {
        wooji.locate(function (pos) {
            if (!mapAvailable) return;
            map.setLevel(5);
            map.panTo(new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
        });
    });

    // 탭 전환
    $('.tab').on('click', function () {
        currentTab = $(this).data('tab');
        $('.tab').removeClass('active');
        $(this).addClass('active');
        $('#myList').toggle(currentTab === 'my');
        $('#exploreList').toggle(currentTab === 'explore');
        $('#exploreSearchRow').toggle(currentTab === 'explore');
        if (currentTab === 'explore') loadPublicCollections();
    });

    /* 이모지 타일 색상 로테이션 */
    function tileClass(id) {
        return 'emoji-tile t' + (((Number(id) || 0) % 4) + 1);
    }

    /* 2일 이내 생성 여부 (NEW 뱃지) */
    function isNew(createdAt) {
        if (!createdAt) return false;
        var t = new Date(String(createdAt).replace(' ', 'T')).getTime();
        return !isNaN(t) && (Date.now() - t) < 2 * 24 * 3600 * 1000;
    }

    /* 멤버 아바타 그룹 (겹친 프로필) - 최대 3명 + 나머지는 +N */
    function avatarGroupHtml(c) {
        if (!c.member_nicknames) return '';
        var names = String(c.member_nicknames).split(',');
        var images = c.member_images ? String(c.member_images).split(',') : [];
        var total = Number(c.member_count) || names.length;
        var html = '<div class="avatar-group">';
        names.slice(0, 3).forEach(function (n, i) {
            html += wooji.avatarHtml(n, images[i], 'c' + ((i % 4) + 1));
        });
        if (total > 3) {
            html += '<span class="av more">+' + (total - 3) + '</span>';
        }
        return html + '</div>';
    }

    function cardHtml(c, isMine) {
        var meta = '장소 ' + c.place_count + ' · 멤버 ' + (c.member_count || 1);
        if (!isMine) meta += ' · by ' + wooji.escapeHtml(c.owner_nickname);
        return '<div class="col-card" data-id="' + c.collection_id + '">'
            + '<div class="' + tileClass(c.collection_id) + '">' + wooji.escapeHtml(c.emoji || '📍') + '</div>'
            + '<div class="name">' + wooji.escapeHtml(c.title)
            + (isNew(c.created_at) ? ' <span class="badge badge-coral">NEW</span>' : '')
            + (isMine && c.is_public === 'Y' ? ' <span class="badge badge-blue">공개</span>' : '')
            + '</div>'
            + avatarGroupHtml(c)
            + '<div class="meta">' + meta + '</div>'
            + (isMine ? '<button class="fav" data-id="' + c.collection_id + '">' + (c.is_favorite > 0 ? '⭐' : '☆') + '</button>' : '')
            + '</div>';
    }

    /* 받은 초대 배너 (링크를 만든 사람 이름으로 안내) */
    function loadPendingInvites() {
        if (!user) return;
        wooji.ajax({
            url: '/api/invites/pending',
            success: function (list) {
                var html = list.map(function (i) {
                    return '<div class="invite-banner">'
                        + '<span style="font-size:20px;">💌</span>'
                        + '<div class="ib-body">'
                        + '<div class="ib-title">' + wooji.escapeHtml(i.created_by_nickname) + '님이 초대장을 보냈어요</div>'
                        + '<div class="ib-sub">' + wooji.escapeHtml(i.emoji || '📍') + ' '
                        + wooji.escapeHtml(i.collection_title) + ' · 멤버 ' + (i.member_count || 1) + '</div>'
                        + '</div>'
                        + '<a class="btn btn-coral btn-sm" href="/invite/' + wooji.escapeHtml(i.invite_code) + '">보기</a>'
                        + '</div>';
                }).join('');
                $('#inviteBanners').html(html);
            },
            error: function () { /* 배너는 실패해도 무시 */ }
        });
    }

    function renderMyList() {
        if (!user) {
            $('#myList').html('<p style="color:var(--caption); font-size:14px; text-align:center; padding:32px 0;">'
                + '로그인하면 내 컬렉션이 여기에 보여요 🗺️</p>');
            return;
        }
        var html = myCollections.map(function (c) { return cardHtml(c, true); }).join('');
        $('#myList').html(html
            || '<p style="color:var(--caption); font-size:14px; text-align:center; padding:32px 0;">아직 컬렉션이 없어요.<br>새 컬렉션을 만들어보세요!</p>');
    }

    /* 모바일 하단 컬렉션 칩 바 */
    function renderChipBar(list) {
        var html = list.map(function (c) {
            return '<div class="col-chip" data-id="' + c.collection_id + '">'
                + wooji.escapeHtml(c.emoji || '📍') + ' ' + wooji.escapeHtml(c.title)
                + ' <span class="cnt">' + c.place_count + '곳</span></div>';
        }).join('');
        $('#chipBar').html(html);
    }

    $(document).on('click', '.col-chip', function () {
        location.href = '/collections/' + $(this).data('id');
    });

    function loadMyCollections() {
        if (!user) { renderMyList(); return; }
        wooji.ajax({
            url: '/api/collections',
            success: function (list) {
                myCollections = list;
                renderMyList();
                renderChipBar(list);
            }
        });
    }

    function loadPublicCollections() {
        wooji.ajax({
            url: '/api/collections/public',
            data: { keyword: $('#colSearch').val().trim() },
            success: function (list) {
                var html = list.map(function (c) { return cardHtml(c, false); }).join('');
                $('#exploreList').html(html
                    || '<p style="color:var(--caption); font-size:14px; text-align:center; padding:32px 0;">공개 컬렉션이 없어요.</p>');
                if (!user) renderChipBar(list);   // 비로그인 칩 바는 공개 컬렉션
            }
        });
    }

    // 비로그인 사용자는 둘러보기 탭이 기본
    if (!user) {
        renderMyList();     // 내 컬렉션 탭 수동 진입 시 로그인 안내 표시용
        $('.tab[data-tab="explore"]').trigger('click');
    } else {
        loadMyCollections();
        loadPendingInvites();
    }

    // 둘러보기 탭의 컬렉션 검색
    $('#colSearch').on('keydown', function (e) { if (e.key === 'Enter') loadPublicCollections(); });

    // 상단 장소 검색
    function clearSearchMarkers() {
        searchMarkers.forEach(function (m) { m.setMap(null); });
        searchMarkers = [];
    }

    function runPlaceSearch() {
        var keyword = $('#topSearch').val().trim();
        if (!keyword) {
            $('#placeResults').hide();
            clearSearchMarkers();
            if (mainInfoWindow) mainInfoWindow.close();
            return;
        }
        $('#placeResults').html('<p style="color:var(--caption); font-size:13px; padding:8px 12px;">검색 중…</p>').show();
        wooji.ajax({
            url: '/api/search/places',
            data: { keyword: keyword },
            success: function (list) {
                placeResults = list;
                if (!list.length) {
                    $('#placeResults').html('<p style="color:var(--caption); font-size:13px; padding:8px 12px;">검색 결과가 없습니다.</p>');
                    clearSearchMarkers();
                    return;
                }
                var html = list.map(function (r, i) {
                    return '<div class="sr-item" data-idx="' + i + '">'
                        + '<div class="sr-name">' + (CATEGORY_ICON[r.category] || '📍') + ' ' + wooji.escapeHtml(r.name) + '</div>'
                        + '<div class="sr-addr">' + wooji.escapeHtml(r.address || '') + '</div>'
                        + '</div>';
                }).join('');
                $('#placeResults').html(html);
                drawSearchMarkers();
                fitSearchBounds();
            },
            error: function (msg) {
                $('#placeResults').html('<p style="color:#EF4444; font-size:13px; padding:8px 12px;">' + wooji.escapeHtml(msg) + '</p>');
            }
        });
    }

    function drawSearchMarkers() {
        if (!mapAvailable) return;
        clearSearchMarkers();
        placeResults.forEach(function (r, i) {
            var pos = new kakao.maps.LatLng(Number(r.lat), Number(r.lng));
            var el = $('<div class="map-marker">' + (CATEGORY_ICON[r.category] || '📍') + '</div>');
            el.on('click', function () { showPlaceInfo(i); });
            var overlay = new kakao.maps.CustomOverlay({
                position: pos, content: el[0], xAnchor: 0.5, yAnchor: 0.5, clickable: true
            });
            overlay.setMap(map);
            searchMarkers.push(overlay);
        });
    }

    function fitSearchBounds() {
        if (!mapAvailable || !placeResults.length) return;
        if (placeResults.length === 1) {
            map.setLevel(4);
            map.panTo(new kakao.maps.LatLng(Number(placeResults[0].lat), Number(placeResults[0].lng)));
            return;
        }
        var bounds = new kakao.maps.LatLngBounds();
        placeResults.forEach(function (r) {
            bounds.extend(new kakao.maps.LatLng(Number(r.lat), Number(r.lng)));
        });
        map.setBounds(bounds, 60);
    }

    /* 검색 결과 장소 인포윈도우: 상세보기 + 이 장소로 컬렉션 만들기 */
    function showPlaceInfo(i) {
        var r = placeResults[i];
        if (!r || !mapAvailable) return;
        var pos = new kakao.maps.LatLng(Number(r.lat), Number(r.lng));
        map.setLevel(4);
        map.panTo(pos);

        var $el = $('<div class="map-info">'
            + '<button class="info-close" title="닫기">✕</button>'
            + '<div style="font-weight:700; font-size:14px;">' + (CATEGORY_ICON[r.category] || '📍') + ' '
            + wooji.escapeHtml(r.name) + '</div>'
            + (r.address ? '<div style="font-size:12px; color:#8B95A1; margin-top:2px;">' + wooji.escapeHtml(r.address) + '</div>' : '')
            + '<div class="info-actions">'
            + '<button class="btn btn-sm btn-primary sr-create" data-idx="' + i + '">이 장소로 컬렉션 만들기</button>'
            + (r.url ? '<button class="btn btn-sm sr-detail" data-idx="' + i + '">카카오맵 상세보기</button>' : '')
            + '</div></div>');

        $el.find('.info-close').on('click', function () { mainInfoWindow.setMap(null); });

        mainInfoWindow.setContent($el[0]);
        mainInfoWindow.setPosition(pos);
        mainInfoWindow.setMap(map);
    }

    $(document).on('click', '.sr-item', function () {
        $('#placeResults').hide();
        showPlaceInfo($(this).data('idx'));
    });

    // 상세보기 -> 카카오 플레이스 페이지
    $(document).on('click', '.sr-detail', function () {
        var r = placeResults[$(this).data('idx')];
        if (r && r.url) window.open(r.url, '_blank');
    });

    // 이 장소로 컬렉션 만들기
    $(document).on('click', '.sr-create', function () {
        var r = placeResults[$(this).data('idx')];
        if (!r || needLogin()) return;
        pendingPlace = r;
        $('#colId').val('');
        $('#colModalTitle').text('이 장소로 컬렉션 만들기');
        $('#colEmoji').val(CATEGORY_ICON[r.category] || '📍');
        $('#colTitle').val('');
        $('#colDesc').val(wooji.escapeHtml(r.name) + '에서 시작하는 지도');
        $('#colCategory').val(r.category === 'CAFE' ? 'CAFE' : 'FOOD');
        $('#colPublic').prop('checked', false);
        $('#colModal').show();
    });

    $('#topSearch').on('keydown', function (e) { if (e.key === 'Enter') runPlaceSearch(); });
    $('#btnTopSearch').on('click', runPlaceSearch);

    // 카드 클릭 -> 상세
    $(document).on('click', '.col-card', function (e) {
        if ($(e.target).hasClass('fav')) return;
        location.href = '/collections/' + $(this).data('id');
    });

    /* 로그인 필요 액션 */
    function needLogin() {
        if (user) return false;
        if (confirm('로그인이 필요한 기능입니다. 로그인 페이지로 이동할까요?')) {
            location.href = '/login';
        }
        return true;
    }

    // 즐겨찾기 토글
    $(document).on('click', '.fav', function (e) {
        e.stopPropagation();
        if (needLogin()) return;
        wooji.ajax({
            url: '/api/collections/' + $(this).data('id') + '/favorite',
            method: 'POST',
            success: loadMyCollections
        });
    });

    // 새 컬렉션
    $('#btnNew').on('click', function () {
        if (needLogin()) return;
        pendingPlace = null;
        $('#colId').val('');
        $('#colModalTitle').text('새 컬렉션');
        $('#colEmoji').val('📍');
        $('#colTitle').val('');
        $('#colDesc').val('');
        $('#colCategory').val('FOOD');
        $('#colPublic').prop('checked', false);
        $('#colModal').show();
    });
    $('#btnColCancel').on('click', function () { $('#colModal').hide(); });

    $('#btnColSave').on('click', function () {
        if (!$('#colTitle').val().trim()) { alert('제목을 입력하세요.'); return; }
        wooji.ajax({
            url: '/api/collections',
            method: 'POST',
            data: {
                emoji: $('#colEmoji').val(),
                title: $('#colTitle').val().trim(),
                description: $('#colDesc').val(),
                category: $('#colCategory').val(),
                isPublic: $('#colPublic').is(':checked') ? 'Y' : 'N'
            },
            success: function (c) {
                // 검색한 장소에서 시작한 경우: 첫 장소로 등록 후 컬렉션으로 이동
                if (pendingPlace) {
                    var p = pendingPlace;
                    pendingPlace = null;
                    wooji.ajax({
                        url: '/api/collections/' + c.collection_id + '/places',
                        method: 'POST',
                        data: {
                            name: p.name,
                            address: p.address || '',
                            lat: Number(p.lat),
                            lng: Number(p.lng),
                            category: p.category || 'ETC',
                            tags: ''
                        },
                        success: function () {
                            location.href = '/collections/' + c.collection_id;
                        }
                    });
                    return;
                }
                $('#colModal').hide();
                loadMyCollections();
            }
        });
    });
});
