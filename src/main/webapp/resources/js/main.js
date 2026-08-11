/**
 * 메인 페이지: 지도 + 컬렉션 목록
 * 비로그인도 접근 가능, 컬렉션 생성/즐겨찾기 등 액션 시에만 로그인 요구
 */
$(function () {
    var user = wooji.getUser();

    // 헤더 - 로그인 상태에 따라 메뉴 전환
    if (user) {
        $('#nickname').text(user.nickname + '님');
        $('#userMenu').show();
    } else {
        $('#authMenu').show();
        $('#mySection').hide();     // 내 컬렉션 섹션은 로그인 시에만
    }

    $('#btnLogout').on('click', wooji.logout);

    emojiPicker.attach('#colEmoji');

    // 지도
    var map = new ol.Map({
        target: 'map',
        layers: [new ol.layer.Tile({ source: new ol.source.OSM() })],
        view: new ol.View({
            center: ol.proj.fromLonLat([126.9780, 37.5665]),   // 서울시청
            zoom: 12
        })
    });

    // 현재 위치로 이동 (허용 시, 실패해도 무시)
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (pos) {
            map.getView().animate({
                center: ol.proj.fromLonLat([pos.coords.longitude, pos.coords.latitude]),
                zoom: 14, duration: 500
            });
        }, function () { /* 거부/실패 시 기본 위치 유지 */ });
    }

    // 목록
    function roleBadge(role) {
        if (role === 'OWNER') return '<span class="badge badge-owner">Owner</span>';
        if (role === 'EDITOR') return '<span class="badge badge-editor">Editor</span>';
        if (role === 'VIEWER') return '<span class="badge badge-viewer">Viewer</span>';
        return '';
    }

    function cardHtml(c, isMine) {
        var html = '<div class="card card-row" data-id="' + c.collection_id + '">';
        if (isMine) {
            html += '<button class="fav" data-id="' + c.collection_id + '">'
                 + (c.is_favorite > 0 ? '⭐' : '☆') + '</button>';
        }
        html += '<div class="title">' + wooji.escapeHtml(c.emoji || '📍') + ' '
             + wooji.escapeHtml(c.title) + '</div>'
             + '<div class="desc">' + wooji.escapeHtml(c.description || '') + '</div>'
             + '<div class="meta">'
             + '<span>📍 ' + c.place_count + '곳</span>'
             + '<span>by ' + wooji.escapeHtml(c.owner_nickname) + '</span>'
             + (isMine ? roleBadge(c.role) : '')
             + (c.is_public === 'Y' ? '<span class="badge badge-public">공개</span>' : '')
             + '</div></div>';
        return html;
    }

    function loadMyCollections() {
        if (!user) return;
        wooji.ajax({
            url: '/api/collections',
            success: function (list) {
                var html = list.map(function (c) { return cardHtml(c, true); }).join('');
                $('#collectionList').html(html ||
                    '<p style="color:#888; font-size:13px;">아직 컬렉션이 없습니다. 새 컬렉션을 만들어보세요!</p>');
            }
        });
    }

    function loadPublicCollections() {
        wooji.ajax({
            url: '/api/collections/public',
            data: { keyword: $('#pubKeyword').val() },
            success: function (list) {
                var html = list.map(function (c) { return cardHtml(c, false); }).join('');
                $('#publicList').html(html || '<p style="color:#888; font-size:13px;">공개 컬렉션이 없습니다.</p>');
            }
        });
    }

    loadMyCollections();
    loadPublicCollections();

    $('#btnPubSearch').on('click', loadPublicCollections);
    $('#pubKeyword').on('keydown', function (e) { if (e.key === 'Enter') loadPublicCollections(); });

    // 카드 클릭 -> 상세
    $(document).on('click', '.card', function (e) {
        if ($(e.target).hasClass('fav')) return;
        location.href = '/collections/' + $(this).data('id');
    });

    // 로그인 필요 액션
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
            success: function () {
                $('#colModal').hide();
                loadMyCollections();
            }
        });
    });
});
