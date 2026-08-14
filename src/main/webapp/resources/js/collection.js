/**
 * 컬렉션 상세: 풀스크린 카카오 지도 + 플로팅 패널(장소 목록)
 * 공개 컬렉션은 비로그인도 열람 가능. 편집/댓글 작성 등은 로그인 필요.
 */
$(function () {
    var myRole = null;              // OWNER / EDITOR / VIEWER
    var places = [];
    var addMode = false;            // 지도 클릭으로 장소 추가 모드
    var user = wooji.getUser();
    var collectionEmoji = '📍';     // 마커에 사용할 컬렉션 대표 이모지
    var markerColor = '#FF6B57';    // 선택된 마커 테두리색 (대표 이모지의 주요 색)

    /* 이모지를 캔버스에 그려 가장 많이 쓰인 색 추출 */
    function dominantEmojiColor(emoji) {
        try {
            var canvas = document.createElement('canvas');
            canvas.width = canvas.height = 48;
            var ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.font = '40px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, 24, 26);

            var data = ctx.getImageData(0, 0, 48, 48).data;
            var counts = {};
            for (var i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 128) continue;                        // 투명 픽셀 제외
                if (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235) continue;   // 흰색 계열 제외
                var key = (data[i] >> 4) + ',' + (data[i + 1] >> 4) + ',' + (data[i + 2] >> 4);
                counts[key] = (counts[key] || 0) + 1;
            }
            var best = null, bestN = 0;
            Object.keys(counts).forEach(function (k) {
                if (counts[k] > bestN) { bestN = counts[k]; best = k; }
            });
            if (!best) return '#FF6B57';
            var p = best.split(',');
            return 'rgb(' + ((p[0] << 4) + 8) + ',' + ((p[1] << 4) + 8) + ',' + ((p[2] << 4) + 8) + ')';
        } catch (e) {
            return '#FF6B57';
        }
    }
    var collectionTitle = '';
    var currentCategory = '';       // 카테고리 칩 필터
    var selectedPlaceId = null;     // 선택된 장소 (코랄 링/카드 강조)

    emojiPicker.attach('#editEmoji');

    var CATEGORY_ICON = {
        RESTAURANT: '🍽️', CAFE: '☕', SIGHT: '🏞️',
        HOTEL: '🏨', SHOP: '🛍️', PARKING: '🅿️', ETC: '📌'
    };
    var CATEGORY_NAME = {
        RESTAURANT: '맛집', CAFE: '카페', SIGHT: '관광지',
        HOTEL: '숙소', SHOP: '쇼핑', PARKING: '주차장', ETC: '기타'
    };

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
    function closePanelOnMobile() {
        if (window.innerWidth <= 768) setMobilePanel(false);
    }

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

    // 카카오 지도
    var mapAvailable = (typeof kakao !== 'undefined') && kakao.maps && kakao.maps.Map;
    var map = null;
    var markers = [];
    var infoWindow = null;

    if (mapAvailable) {
        map = new kakao.maps.Map(document.getElementById('map'), {
            center: new kakao.maps.LatLng(37.5665, 126.9780),   // 서울시청
            level: 8
        });

        infoWindow = new kakao.maps.CustomOverlay({ yAnchor: 1.25, zIndex: 3, clickable: true });
        infoWindow.close = function () { this.setMap(null); };

        // 지도 클릭: 추가 모드면 장소 등록(주소 자동 입력), 아니면 선택 해제
        kakao.maps.event.addListener(map, 'click', function (e) {
            if (addMode) {
                var lat = e.latLng.getLat(), lng = e.latLng.getLng();
                openPlaceModal(null, lat, lng);
                setAddMode(false);
                fillAddressByCoord(lat, lng);
                return;
            }
            infoWindow.close();
            selectPlace(null);
        });

        // 줌/이동 후 클러스터 재계산
        kakao.maps.event.addListener(map, 'idle', redrawMarkers);
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

    /* 좌표 -> 주소 역지오코딩 후 장소 모달 주소칸 자동 입력 */
    function fillAddressByCoord(lat, lng) {
        if (!mapAvailable || !kakao.maps.services) return;
        new kakao.maps.services.Geocoder().coord2Address(lng, lat, function (result, status) {
            if (status === kakao.maps.services.Status.OK && result.length) {
                var addr = result[0].road_address
                    ? result[0].road_address.address_name
                    : result[0].address.address_name;
                if (!$('#placeAddress').val()) {
                    $('#placeAddress').val(addr);
                }
            }
        });
    }

    /* 장소 선택 (마커 코랄 링 + 카드 강조) */
    function selectPlace(placeId) {
        selectedPlaceId = placeId;
        $('.place-card').removeClass('selected');
        if (placeId != null) {
            $('.place-card[data-id="' + placeId + '"]').addClass('selected');
        }
        redrawMarkers();
    }

    function clearMarkers() {
        markers.forEach(function (m) { m.setMap(null); });
        markers = [];
    }

    /* 픽셀 그리드 기반 간이 클러스터링 후 마커 표시 */
    function redrawMarkers() {
        if (!mapAvailable) return;
        clearMarkers();
        if (!places.length) return;

        var proj = map.getProjection();
        var cells = {};
        places.forEach(function (p) {
            var pos = new kakao.maps.LatLng(Number(p.lat), Number(p.lng));
            var off = proj.containerPointFromCoords(pos);
            var key = Math.round(off.x / 70) + '_' + Math.round(off.y / 70);
            (cells[key] = cells[key] || []).push({ p: p, pos: pos });
        });

        Object.keys(cells).forEach(function (key) {
            var group = cells[key];
            if (group.length === 1) {
                markers.push(createPlaceMarker(group[0].p, group[0].pos));
            } else {
                markers.push(createClusterMarker(group));
            }
        });
    }

    function createPlaceMarker(p, pos) {
        var selected = p.place_id === selectedPlaceId;
        var el = $('<div class="map-marker-wrap' + (selected ? ' selected' : '') + '">'
            + '<div class="map-marker">' + wooji.escapeHtml(collectionEmoji) + '</div>'
            + '<div class="map-marker-name">' + wooji.escapeHtml(p.name) + '</div>'
            + '</div>');
        if (selected) {
            // 선택 테두리는 대표 이모지에서 뽑은 색 사용
            el.find('.map-marker').css('border-color', markerColor);
            el.find('.map-marker-name').css('background-color', markerColor);
        }
        el.on('click', function () {
            selectPlace(p.place_id);
            openInfoWindow(p, pos);
        });

        var overlay = new kakao.maps.CustomOverlay({
            position: pos,
            content: el[0],
            xAnchor: 0.5,
            yAnchor: 0.5,
            clickable: true
        });
        overlay.setMap(map);
        return overlay;
    }

    function createClusterMarker(group) {
        var latSum = 0, lngSum = 0;
        group.forEach(function (g) { latSum += g.pos.getLat(); lngSum += g.pos.getLng(); });
        var center = new kakao.maps.LatLng(latSum / group.length, lngSum / group.length);

        var el = $('<div class="map-cluster">+' + group.length + '</div>');
        el.on('click', function () {
            map.setLevel(Math.max(map.getLevel() - 2, 1), { anchor: center });
        });

        var overlay = new kakao.maps.CustomOverlay({
            position: center,
            content: el[0],
            xAnchor: 0.5,
            yAnchor: 0.5,
            clickable: true
        });
        overlay.setMap(map);
        return overlay;
    }

    function openInfoWindow(p, pos) {
        var $el = $('<div class="map-info">'
            + '<button class="info-close" title="닫기">✕</button>'
            + '<div style="font-weight:700; font-size:14px;">'
            + (CATEGORY_ICON[p.category] || '📌') + ' ' + wooji.escapeHtml(p.name) + '</div>'
            + (p.address ? '<div style="font-size:12px; color:#8B95A1; margin-top:2px;">' + wooji.escapeHtml(p.address) + '</div>' : '')
            + '<div class="info-actions row">'
            + '<button class="btn btn-sm btn-primary info-detail">상세보기</button>'
            + '<button class="btn btn-sm info-kakao">카카오맵 상세보기</button>'
            + '</div></div>');

        $el.find('.info-close').on('click', function () { infoWindow.setMap(null); });
        $el.find('.info-detail').on('click', function () { openPlaceModal(p); });
        $el.find('.info-kakao').on('click', function () { openKakaoPlace(p); });

        infoWindow.setContent($el[0]);
        infoWindow.setPosition(pos);
        infoWindow.setMap(map);
    }

    /* 전체 장소가 보이도록 지도 맞춤 */
    function fitAllPlaces() {
        if (!mapAvailable || !places.length) return;
        if (places.length === 1) {
            map.setLevel(4);
            map.panTo(new kakao.maps.LatLng(Number(places[0].lat), Number(places[0].lng)));
            return;
        }
        var bounds = new kakao.maps.LatLngBounds();
        places.forEach(function (p) {
            bounds.extend(new kakao.maps.LatLng(Number(p.lat), Number(p.lng)));
        });
        map.setBounds(bounds, 60);
    }

    // 전역 노출 (인포윈도우 내 onclick)
    window.openPlaceDetail = function (placeId) {
        var p = places.find(function (x) { return x.place_id === placeId; });
        if (p) openPlaceModal(p);
    };

    /**
     * 카카오 장소 상세 페이지 열기 (place.map.kakao.com/{placeId})
     * 저장된 장소에는 카카오 장소 ID가 없으므로 이름+좌표로 조회해 가장 가까운 결과를 사용,
     * 못 찾으면 좌표 기반 지도 링크로 폴백
     */
    function openKakaoPlace(p) {
        var fallback = 'https://map.kakao.com/link/map/'
            + encodeURIComponent(p.name) + ',' + p.lat + ',' + p.lng;
        var win = window.open('', '_blank');   // 팝업 차단 방지: 먼저 창을 연 뒤 주소 설정

        if (!mapAvailable || !kakao.maps.services) {
            if (win) win.location.href = fallback;
            return;
        }

        new kakao.maps.services.Places().keywordSearch(p.name, function (data, status) {
            var url = fallback;
            if (status === kakao.maps.services.Status.OK && data.length) {
                var best = data[0], bestDist = Infinity;
                data.forEach(function (d) {
                    var dx = Number(d.y) - Number(p.lat);
                    var dy = Number(d.x) - Number(p.lng);
                    var dist = dx * dx + dy * dy;
                    if (dist < bestDist) { bestDist = dist; best = d; }
                });
                url = 'https://place.map.kakao.com/' + best.id;
            }
            if (win) { win.location.href = url; } else { window.open(url, '_blank'); }
        }, {
            location: new kakao.maps.LatLng(Number(p.lat), Number(p.lng)),
            radius: 1000,
            sort: kakao.maps.services.SortBy.DISTANCE
        });
    }

    /* 헤더 멤버 아바타 그룹 (겹친 프로필 + 초대 버튼) */
    function renderHeadAvatars(c) {
        if (!c.member_nicknames) { $('#headAvatars').empty(); return; }
        var names = String(c.member_nicknames).split(',');
        var images = c.member_images ? String(c.member_images).split(',') : [];
        var total = Number(c.member_count) || names.length;
        var html = '';
        names.slice(0, 3).forEach(function (n, i) {
            html += wooji.avatarHtml(n, images[i], 'c' + ((i % 4) + 1));
        });
        if (total > 3) {
            html += '<span class="av more" title="멤버 ' + total + '명">+' + (total - 3) + '</span>';
        }
        if (myRole === 'OWNER') {
            html += '<span class="av add" id="btnAvatarInvite" title="멤버 초대">+</span>';
        }
        $('#headAvatars').html(html);
    }

    // 아바타 클릭 -> 멤버 목록 / + 버튼 -> 공유 모달
    $(document).on('click', '#btnAvatarInvite', function (e) {
        e.stopPropagation();
        loadInvites();
        $('#shareModal').show();
    });
    $(document).on('click', '#headAvatars', function (e) {
        if ($(e.target).is('#btnAvatarInvite')) return;
        if (!myRole) return;
        $('#btnMembers').click();
    });

    // 컬렉션 정보
    function loadCollection() {
        wooji.ajax({
            url: '/api/collections/' + COLLECTION_ID,
            error: function (msg) {
                alert(msg);
                location.href = '/main';
            },
            success: function (c) {
                myRole = c.my_role;
                collectionEmoji = c.emoji || '📍';
                collectionTitle = c.title;
                markerColor = dominantEmojiColor(collectionEmoji);
                redrawMarkers();    // 대표 이모지 / 선택 테두리색 반영

                $('#colEmoji').text(collectionEmoji);
                $('#colTitle').text(c.title);
                $('#colSub').text('장소 ' + c.place_count + ' · 멤버 ' + (c.member_count || 1)
                    + (myRole ? '' : ' · 보기 전용'));
                $('#memberModalTitle').text(collectionEmoji + ' ' + c.title + ' · 멤버 ' + (c.member_count || 1));
                $('#commentModalTitle').text('댓글 · ' + c.title);
                renderHeadAvatars(c);

                var canEdit = myRole === 'OWNER' || myRole === 'EDITOR';
                $('#btnAddPlace').toggle(canEdit);
                $('#btnShare').toggle(myRole === 'OWNER');
                $('#btnEditCol').toggle(myRole === 'OWNER');
                $('#btnMembers').toggle(!!myRole);   // 멤버 목록은 멤버만

                // 권한이 장소 목록보다 늦게 도착할 수 있으므로 목록을 다시 그림 (삭제 ✕ 노출)
                if (places.length) renderPlaceList();

                // 설정 모달 초기값
                $('#editEmoji').val(c.emoji);
                $('#editTitle').val(c.title);
                $('#editDesc').val(c.description);
                $('#editCategory').val(c.category || 'ETC');
                $('#editPublic').prop('checked', c.is_public === 'Y');
            }
        });
    }

    // 장소
    function loadPlaces(fit) {
        wooji.ajax({
            url: '/api/collections/' + COLLECTION_ID + '/places',
            data: {
                keyword: $('#searchKeyword').val(),
                category: currentCategory
            },
            success: function (list) {
                places = list;
                $('#placeCount').text(places.length);
                renderCategoryChips();
                renderPlaceList();
                redrawMarkers();
                if (fit) fitAllPlaces();
            }
        });
    }

    /* 카테고리 칩: 전체 + 데이터에 존재하는 카테고리 */
    function renderCategoryChips() {
        var cats = [];
        places.forEach(function (p) {
            var c = p.category || 'ETC';
            if (cats.indexOf(c) < 0) cats.push(c);
        });
        var html = '<button class="chip' + (currentCategory === '' ? ' active' : '') + '" data-cat="">전체</button>';
        cats.forEach(function (c) {
            html += '<button class="chip' + (currentCategory === c ? ' active' : '') + '" data-cat="' + c + '">'
                + (CATEGORY_ICON[c] || '📌') + ' ' + (CATEGORY_NAME[c] || c) + '</button>';
        });
        // 필터 중일 때는 현재 선택 칩이 목록에 없더라도 유지
        if (currentCategory && cats.indexOf(currentCategory) < 0) {
            html += '<button class="chip active" data-cat="' + currentCategory + '">'
                + (CATEGORY_ICON[currentCategory] || '📌') + ' ' + (CATEGORY_NAME[currentCategory] || currentCategory) + '</button>';
        }
        $('#categoryChips').html(html);
    }

    $(document).on('click', '#categoryChips .chip', function () {
        currentCategory = $(this).data('cat');
        loadPlaces(true);
    });

    /* 이모지 타일 색상 로테이션 */
    function tileClass(id) {
        return 'emoji-tile t' + (((Number(id) || 0) % 4) + 1);
    }

    function renderPlaceList() {
        var canEdit = myRole === 'OWNER' || myRole === 'EDITOR';
        var html = places.map(function (p) {
            var cat = p.category || 'ETC';
            var tags = '';
            if (p.tags) {
                tags = wooji.escapeHtml(p.tags).split(',').map(function (t) {
                    return '<span class="tag">#' + t.trim() + '</span>';
                }).join(' ');
            }
            return '<div class="place-card' + (p.place_id === selectedPlaceId ? ' selected' : '')
                + (canEdit ? ' deletable' : '') + '" data-id="' + p.place_id + '">'
                + (canEdit ? '<button class="place-del" data-id="' + p.place_id + '" title="장소 삭제">✕</button>' : '')
                + '<div class="' + tileClass(p.place_id) + '">' + (CATEGORY_ICON[cat] || '📌') + '</div>'
                + '<div class="body">'
                + '<div class="name">' + wooji.escapeHtml(p.name)
                + ' <span class="badge badge-blue">' + (CATEGORY_NAME[cat] || cat) + '</span></div>'
                + (p.address ? '<div class="addr">' + wooji.escapeHtml(p.address)
                    + ' · ' + wooji.escapeHtml(p.created_by_nickname) + ' 추가</div>' : '')
                + '<div class="meta">'
                + (p.photo_count > 0 ? '<span>📷 ' + p.photo_count + '</span>' : '')
                + tags
                + '</div></div></div>';
        }).join('');
        $('#placeList').html(html
            || '<p style="color:var(--caption); font-size:14px; text-align:center; padding:32px 0;">아직 등록된 장소가 없어요.<br>첫 장소를 추가해보세요!</p>');
    }

    // 목록의 ✕ -> 장소 삭제 (카드 클릭과 분리)
    $(document).on('click', '.place-del', function (e) {
        e.stopPropagation();
        var placeId = $(this).data('id');
        var p = places.find(function (x) { return x.place_id === placeId; });
        if (!p) return;
        if (!confirm('\'' + p.name + '\' 장소를 삭제할까요?\n삭제하면 되돌릴 수 없어요.')) return;

        wooji.ajax({
            url: '/api/places/' + placeId,
            method: 'DELETE',
            success: function () {
                if (selectedPlaceId === placeId) {
                    selectedPlaceId = null;
                    if (infoWindow) infoWindow.setMap(null);
                }
                loadPlaces();
                loadCollection();   // 장소 수 갱신
            }
        });
    });

    // 목록 클릭 -> 선택 + 지도 이동 + 인포윈도우
    $(document).on('click', '.place-card', function () {
        var p = places.find(function (x) { return x.place_id === $(this).data('id'); }.bind(this));
        if (!p) return;
        selectPlace(p.place_id);
        closePanelOnMobile();
        if (!mapAvailable) return;
        var pos = new kakao.maps.LatLng(Number(p.lat), Number(p.lng));
        map.setLevel(3);
        map.panTo(pos);
        openInfoWindow(p, pos);
    });

    $('#searchKeyword').on('keydown', function (e) { if (e.key === 'Enter') loadPlaces(true); });

    /* 장소 추가 모드 (지도 클릭) */
    function setAddMode(on) {
        addMode = on;
        $('#addHint').toggle(on);
        if (mapAvailable) map.setCursor(on ? 'crosshair' : 'auto');
    }
    $('#addHint').on('click', function () { setAddMode(false); });

    // "+ 장소 추가" -> 상호 검색 모달
    $('#btnAddPlace').on('click', function () {
        $('#poiResults').empty();
        $('#poiKeyword').val('');
        $('#poiModal').show();
        $('#poiKeyword').focus();
    });
    $('#btnPoiClose').on('click', function () { $('#poiModal').hide(); });

    // 지도에서 직접 선택
    $('#btnMapPick').on('click', function () {
        $('#poiModal').hide();
        closePanelOnMobile();
        setAddMode(true);
    });

    // 상호 검색
    var poiResults = [];

    function searchPoi() {
        var keyword = $('#poiKeyword').val().trim();
        if (!keyword) return;
        $('#poiResults').html('<p style="color:var(--caption); font-size:13px;">검색 중…</p>');
        wooji.ajax({
            url: '/api/search/places',
            data: { keyword: keyword },
            success: function (list) {
                poiResults = list;
                if (!list.length) {
                    $('#poiResults').html('<p style="color:var(--caption); font-size:13px;">검색 결과가 없습니다.</p>');
                    return;
                }
                var html = list.map(function (r, i) {
                    return '<div class="place-card poi-item" data-idx="' + i + '">'
                        + '<div class="' + tileClass(i) + '">' + (CATEGORY_ICON[r.category] || '📌') + '</div>'
                        + '<div class="body">'
                        + '<div class="name">' + wooji.escapeHtml(r.name) + '</div>'
                        + '<div class="addr">' + wooji.escapeHtml(r.address || '') + '</div>'
                        + (r.categoryName ? '<div class="meta">' + wooji.escapeHtml(r.categoryName) + '</div>' : '')
                        + '</div></div>';
                }).join('');
                $('#poiResults').html(html);
            },
            error: function (msg) {
                $('#poiResults').html('<p style="color:#EF4444; font-size:13px;">' + wooji.escapeHtml(msg) + '</p>');
            }
        });
    }

    $('#btnPoiSearch').on('click', searchPoi);
    $('#poiKeyword').on('keydown', function (e) { if (e.key === 'Enter') searchPoi(); });

    // 검색 결과 선택 -> 장소 등록 모달 자동 입력 + 지도 이동
    $(document).on('click', '.poi-item', function () {
        var r = poiResults[$(this).data('idx')];
        if (!r) return;
        $('#poiModal').hide();

        var lat = Number(r.lat), lng = Number(r.lng);
        openPlaceModal(null, lat, lng);
        $('#placeName').val(r.name);
        $('#placeAddress').val(r.address || '');
        $('#placeCategory').val(r.category || 'ETC');

        if (mapAvailable) {
            map.setLevel(3);
            map.panTo(new kakao.maps.LatLng(lat, lng));
        }
    });

    // 장소 등록/상세 모달
    function openPlaceModal(p, lat, lng) {
        var canEdit = myRole === 'OWNER' || myRole === 'EDITOR';
        $('#placeModalTitle').text(p ? '장소 상세' : '장소 등록');
        $('#placeId').val(p ? p.place_id : '');
        $('#placeLat').val(p ? p.lat : lat);
        $('#placeLng').val(p ? p.lng : lng);
        $('#placeName').val(p ? p.name : '');
        $('#placeAddress').val(p ? p.address : '');
        $('#placeCategory').val(p ? (p.category || 'ETC') : 'RESTAURANT');
        $('#placeTags').val(p ? p.tags : '');
        $('#btnPlaceDelete').toggle(!!p && canEdit);
        $('#btnPlaceSave').toggle(canEdit);
        $('#photoGroup').toggle(!!p);
        $('#photoList').empty();
        if (p) loadPhotos(p.place_id);
        $('#placeModal').show();
    }

    function loadPhotos(placeId) {
        wooji.ajax({
            url: '/api/places/' + placeId,
            success: function (p) {
                var html = (p.photos || []).map(function (ph) {
                    return '<img src="' + ph.file_path + '" style="width:70px; height:70px; object-fit:cover; border-radius:12px;">';
                }).join('');
                $('#photoList').html(html);
            }
        });
    }

    $('#btnPlaceCancel').on('click', function () { $('#placeModal').hide(); });

    $('#btnPlaceSave').on('click', function () {
        if (!$('#placeName').val().trim()) { alert('장소명을 입력하세요.'); return; }
        var placeId = $('#placeId').val();
        var data = {
            name: $('#placeName').val().trim(),
            address: $('#placeAddress').val(),
            lat: Number($('#placeLat').val()),
            lng: Number($('#placeLng').val()),
            category: $('#placeCategory').val(),
            tags: $('#placeTags').val()
        };

        function afterSave(savedId) {
            var file = $('#placePhoto')[0].files[0];
            if (file && savedId) {
                var fd = new FormData();
                fd.append('file', file);
                wooji.ajax({
                    url: '/api/places/' + savedId + '/photos',
                    method: 'POST',
                    formData: fd,
                    success: done, error: done
                });
            } else {
                done();
            }
            function done() {
                $('#placeModal').hide();
                $('#placePhoto').val('');
                loadPlaces();
                loadCollection();
            }
        }

        if (placeId) {
            wooji.ajax({
                url: '/api/places/' + placeId,
                method: 'PUT',
                data: data,
                success: function () { afterSave(placeId); }
            });
        } else {
            wooji.ajax({
                url: '/api/collections/' + COLLECTION_ID + '/places',
                method: 'POST',
                data: data,
                success: function (p) { afterSave(p.place_id); }
            });
        }
    });

    $('#btnPlaceDelete').on('click', function () {
        if (!confirm('이 장소를 삭제할까요?')) return;
        wooji.ajax({
            url: '/api/places/' + $('#placeId').val(),
            method: 'DELETE',
            success: function () {
                $('#placeModal').hide();
                if (infoWindow) infoWindow.close();
                selectPlace(null);
                loadPlaces();
                loadCollection();
            }
        });
    });

    // 공유
    $('#btnShare').on('click', function () { loadInvites(); $('#shareModal').show(); });
    $('#btnShareClose').on('click', function () { $('#shareModal').hide(); });

    $('#btnCreateInvite').on('click', function () {
        var data = { role: $('#inviteRole').val() };
        if ($('#inviteExpires').val()) data.expiresInHours = Number($('#inviteExpires').val());
        wooji.ajax({
            url: '/api/collections/' + COLLECTION_ID + '/invites',
            method: 'POST',
            data: data,
            success: function (invite) {
                var url = location.origin + '/invite/' + invite.inviteCode;
                copyText(url);
                alert('초대 링크가 복사되었습니다.\n' + url);
                loadInvites();
            }
        });
    });

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text);
        } else {
            var $tmp = $('<textarea>').val(text).appendTo('body');
            $tmp[0].select();
            document.execCommand('copy');
            $tmp.remove();
        }
    }

    var latestInviteUrl = null;

    function loadInvites() {
        wooji.ajax({
            url: '/api/collections/' + COLLECTION_ID + '/invites',
            success: function (list) {
                latestInviteUrl = null;
                var html = list.map(function (i) {
                    var active = i.active_yn === 'Y';
                    var expired = i.expires_at && new Date(i.expires_at) < new Date();
                    var usable = active && !expired;
                    var status = !active ? '취소됨' : (expired ? '만료됨' : '활성');
                    var url = location.origin + '/invite/' + i.invite_code;
                    if (usable && !latestInviteUrl) latestInviteUrl = url;

                    var expireText = i.expires_at
                        ? String(i.expires_at).replace('T', ' ').substring(0, 16) + ' 까지'
                        : '무기한';

                    return '<div class="invite-row' + (usable ? '' : ' off') + '">'
                        + '<div class="top">'
                        + '<span class="badge ' + (i.role === 'EDITOR' ? 'badge-blue' : 'badge-gray') + '">'
                        + (i.role === 'EDITOR' ? '편집' : '보기') + '</span>'
                        + '<span class="badge ' + (usable ? 'badge-coral' : 'badge-gray') + '">' + status + '</span>'
                        + '<span class="exp">' + expireText + '</span>'
                        + (usable
                            ? '<button class="btn btn-sm btn-tint copy-invite" data-url="' + url + '">복사</button>'
                              + '<button class="btn btn-sm cancel-invite" data-id="' + i.invite_id + '">취소</button>'
                            : '')
                        + '</div>'
                        + '<div class="url">' + url.replace(/^https?:\/\//, '') + '</div>'
                        + '</div>';
                }).join('');
                $('#inviteList').html(html
                    || '<p style="color:var(--caption); font-size:13px; text-align:center; padding:16px 0;">아직 발급된 링크가 없어요.</p>');
            }
        });
    }

    $(document).on('click', '.cancel-invite', function () {
        if (!confirm('이 링크를 취소할까요? 더 이상 이 링크로 참여할 수 없어요.')) return;
        wooji.ajax({
            url: '/api/invites/' + $(this).data('id'),
            method: 'DELETE',
            success: loadInvites
        });
    });

    $(document).on('click', '.copy-invite', function () {
        copyText($(this).data('url'));
        var $btn = $(this);
        $btn.text('복사됨');
        setTimeout(function () { $btn.text('복사'); }, 1500);
    });

    // 멤버/권한
    $('#btnMembers').on('click', function () {
        loadMembers();
        if (myRole === 'OWNER') loadInvitesForMemberModal();
        $('#memberModal').show();
    });
    $('#btnMemberClose').on('click', function () { $('#memberModal').hide(); });

    /* 멤버 모달 하단: 최신 활성 초대 링크 표시 (OWNER) */
    function loadInvitesForMemberModal() {
        wooji.ajax({
            url: '/api/collections/' + COLLECTION_ID + '/invites',
            success: function (list) {
                var url = null;
                list.forEach(function (i) {
                    var expired = i.expires_at && new Date(i.expires_at) < new Date();
                    if (!url && i.active_yn === 'Y' && !expired) {
                        url = location.origin + '/invite/' + i.invite_code;
                    }
                });
                if (url) {
                    $('#inviteLinkUrl').text(url.replace(/^https?:\/\//, ''));
                    $('#inviteLinkBox').data('url', url).show();
                } else {
                    $('#inviteLinkBox').hide();
                }
            }
        });
    }

    $('#btnCopyInvite').on('click', function () {
        copyText($('#inviteLinkBox').data('url'));
        $(this).text('복사됨!');
        var $btn = $(this);
        setTimeout(function () { $btn.text('복사'); }, 1500);
    });

    function roleLabel(m) {
        if (m.role === 'OWNER') return '<span class="badge badge-coral">방장</span>';
        return '';
    }

    function loadMembers() {
        wooji.ajax({
            url: '/api/collections/' + COLLECTION_ID + '/members',
            success: function (list) {
                var html = list.map(function (m) {
                    var isMe = user && m.user_id === user.userId;
                    var sub = m.role === 'OWNER' ? '만든 사람' : (m.role === 'EDITOR' ? '편집 가능' : '아직 구경만');
                    var right;
                    if (m.role === 'OWNER') {
                        right = roleLabel(m);
                    } else if (myRole === 'OWNER') {
                        right = '<select class="role-select" data-id="' + m.user_id + '">'
                            + '<option value="EDITOR"' + (m.role === 'EDITOR' ? ' selected' : '') + '>편집</option>'
                            + '<option value="VIEWER"' + (m.role === 'VIEWER' ? ' selected' : '') + '>보기</option>'
                            + '</select> '
                            + '<button class="btn btn-sm btn-danger remove-member" data-id="' + m.user_id + '">내보내기</button>';
                    } else if (isMe) {
                        right = '<button class="btn btn-sm remove-member" data-id="' + m.user_id + '">나가기</button>';
                    } else {
                        right = '<span class="badge badge-gray">' + (m.role === 'EDITOR' ? '편집' : '보기') + '</span>';
                    }
                    return '<div class="member-row">'
                        + wooji.avatarHtml(m.nickname, m.profile_image, '', 'avatar')
                        + '<div class="info"><div class="n">' + wooji.escapeHtml(m.nickname) + (isMe ? ' (나)' : '') + '</div>'
                        + '<div class="s">' + sub + '</div></div>'
                        + '<span style="display:flex; gap:6px; align-items:center;">' + right + '</span>'
                        + '</div>';
                }).join('');
                $('#memberList').html(html);
            }
        });
    }

    $(document).on('change', '.role-select', function () {
        wooji.ajax({
            url: '/api/collections/' + COLLECTION_ID + '/members/' + $(this).data('id'),
            method: 'PUT',
            data: { role: $(this).val() },
            success: loadMembers
        });
    });

    $(document).on('click', '.remove-member', function () {
        var targetId = $(this).data('id');
        var isMe = user && targetId === user.userId;
        if (!confirm(isMe ? '컬렉션에서 나가시겠어요?' : '이 멤버를 내보낼까요?')) return;
        wooji.ajax({
            url: '/api/collections/' + COLLECTION_ID + '/members/' + targetId,
            method: 'DELETE',
            success: function () {
                if (isMe) { location.href = '/main'; } else { loadMembers(); }
            }
        });
    });

    // 댓글 (채팅 버블)
    $('#btnComments').on('click', function () { loadComments(); $('#commentModal').show(); });
    $('#btnCommentClose').on('click', function () { $('#commentModal').hide(); });

    function loadComments() {
        wooji.ajax({
            url: '/api/collections/' + COLLECTION_ID + '/comments',
            success: function (list) {
                // 채팅처럼 오래된 댓글이 위로
                var html = list.slice().reverse().map(function (c) {
                    var isMine = user && c.user_id === user.userId;
                    var time = c.created_at ? String(c.created_at).substring(11, 16) : '';
                    return '<div class="cmt' + (isMine ? ' mine' : '') + '">'
                        + wooji.avatarHtml(c.nickname, c.profile_image, '', 'avatar')
                        + '<div class="wrap">'
                        + '<div class="bubble">' + wooji.escapeHtml(c.content) + '</div>'
                        + '<div class="info">'
                        + '<span>' + wooji.escapeHtml(c.nickname) + ' · ' + time + '</span>'
                        + '<span class="like-comment" data-id="' + c.comment_id + '">'
                        + (c.liked_by_me > 0 ? '❤️' : '🤍') + ' ' + c.like_count + '</span>'
                        + (isMine ? '<span class="edit-comment" data-id="' + c.comment_id + '">수정</span>'
                                  + '<span class="del-comment" data-id="' + c.comment_id + '">삭제</span>' : '')
                        + '</div></div></div>';
                }).join('');
                $('#commentList').html(html
                    || '<p style="color:var(--caption); font-size:13px; text-align:center; padding:20px 0;">첫 댓글을 남겨보세요!</p>');
                $('#commentList').scrollTop($('#commentList')[0].scrollHeight);
            }
        });
    }

    $('#btnCommentAdd').on('click', addComment);
    $('#commentInput').on('keydown', function (e) { if (e.key === 'Enter') addComment(); });

    function addComment() {
        var content = $('#commentInput').val().trim();
        if (!content) return;
        wooji.ajax({
            url: '/api/collections/' + COLLECTION_ID + '/comments',
            method: 'POST',
            data: { content: content },
            success: function () {
                $('#commentInput').val('');
                loadComments();
            }
        });
    }

    $(document).on('click', '.like-comment', function () {
        wooji.ajax({
            url: '/api/comments/' + $(this).data('id') + '/like',
            method: 'POST',
            success: loadComments
        });
    });

    $(document).on('click', '.edit-comment', function () {
        var newContent = prompt('댓글 수정:');
        if (newContent === null || !newContent.trim()) return;
        wooji.ajax({
            url: '/api/comments/' + $(this).data('id'),
            method: 'PUT',
            data: { content: newContent.trim() },
            success: loadComments
        });
    });

    $(document).on('click', '.del-comment', function () {
        if (!confirm('댓글을 삭제할까요?')) return;
        wooji.ajax({
            url: '/api/comments/' + $(this).data('id'),
            method: 'DELETE',
            success: loadComments
        });
    });

    // 컬렉션 설정
    $('#btnEditCol').on('click', function () { $('#colEditModal').show(); });
    $('#btnColEditCancel').on('click', function () { $('#colEditModal').hide(); });

    $('#btnColEditSave').on('click', function () {
        wooji.ajax({
            url: '/api/collections/' + COLLECTION_ID,
            method: 'PUT',
            data: {
                emoji: $('#editEmoji').val(),
                title: $('#editTitle').val(),
                description: $('#editDesc').val(),
                category: $('#editCategory').val(),
                isPublic: $('#editPublic').is(':checked') ? 'Y' : 'N'
            },
            success: function () {
                $('#colEditModal').hide();
                loadCollection();
            }
        });
    });

    $('#btnColDelete').on('click', function () {
        if (!confirm('컬렉션과 모든 장소가 삭제됩니다. 계속할까요?')) return;
        wooji.ajax({
            url: '/api/collections/' + COLLECTION_ID,
            method: 'DELETE',
            success: function () { location.href = '/main'; }
        });
    });

    $('#btnColClone').on('click', function () {
        wooji.ajax({
            url: '/api/collections/' + COLLECTION_ID + '/clone',
            method: 'POST',
            success: function (c) {
                alert('복제되었습니다.');
                location.href = '/collections/' + c.collection_id;
            }
        });
    });

    // 초기 로드
    loadCollection();
    loadPlaces(true);
});
