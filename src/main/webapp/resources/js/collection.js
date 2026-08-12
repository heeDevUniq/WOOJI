/**
 * 컬렉션 상세: 카카오 지도 + 장소/공유/멤버/댓글
 * 공개 컬렉션은 비로그인도 열람 가능. 편집/댓글 작성 등은 로그인 필요.
 */
$(function () {
    var myRole = null;          // OWNER / EDITOR / VIEWER
    var places = [];
    var addMode = false;        // 지도 클릭으로 장소 추가 모드
    var user = wooji.getUser();
    var collectionEmoji = '📍'; // 마커에 사용할 컬렉션 대표 이모지
    var markerColor = '#2563eb'; // 마커 테두리색 (대표 이모지의 주요 색)

    /** 이모지를 캔버스에 그려 가장 많이 쓰인 색 추출 (16단계 양자화) */
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
                if (data[i + 3] < 128) continue;   // 투명 픽셀 제외
                var key = (data[i] >> 4) + ',' + (data[i + 1] >> 4) + ',' + (data[i + 2] >> 4);
                counts[key] = (counts[key] || 0) + 1;
            }
            var best = null, bestN = 0;
            Object.keys(counts).forEach(function (k) {
                if (counts[k] > bestN) { bestN = counts[k]; best = k; }
            });
            if (!best) return '#2563eb';
            var p = best.split(',');
            return 'rgb(' + ((p[0] << 4) + 8) + ',' + ((p[1] << 4) + 8) + ',' + ((p[2] << 4) + 8) + ')';
        } catch (e) {
            return '#2563eb';
        }
    }

    emojiPicker.attach('#editEmoji');

    // 모바일: 햄버거로 사이드패널 토글
    $('#btnPanel').on('click', function () {
        var open = !$('.side-panel').hasClass('open');
        $('.side-panel').toggleClass('open', open);
        $('#panelBackdrop').toggleClass('show', open);
    });
    $('#panelBackdrop').on('click', function () {
        $('.side-panel').removeClass('open');
        $(this).removeClass('show');
    });
    // 모바일에서 장소 클릭 시 지도가 보이도록 패널 닫기
    $(document).on('click', '.place-item:not(.poi-item)', function () {
        if (window.innerWidth <= 768) {
            $('.side-panel').removeClass('open');
            $('#panelBackdrop').removeClass('show');
        }
    });

    var CATEGORY_ICON = {
        RESTAURANT: '🍽️', CAFE: '☕', SIGHT: '🏞️',
        HOTEL: '🏨', SHOP: '🛍️', PARKING: '🅿️', ETC: '📌'
    };

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

        infoWindow = new kakao.maps.InfoWindow({ removable: true });

        // 지도 클릭: 추가 모드면 장소 등록(주소 자동 입력), 아니면 인포윈도우 닫기
        kakao.maps.event.addListener(map, 'click', function (e) {
            if (addMode) {
                var lat = e.latLng.getLat(), lng = e.latLng.getLng();
                openPlaceModal(null, lat, lng);
                setAddMode(false);
                fillAddressByCoord(lat, lng);
                return;
            }
            infoWindow.close();
        });

        // 줌/이동 후 클러스터 재계산
        kakao.maps.event.addListener(map, 'idle', redrawMarkers);
    } else {
        $('#map').html('<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#888; font-size:14px; text-align:center;">'
            + '카카오 지도를 불러올 수 없습니다.<br>application.yml 의 kakao.map.js-key 설정을 확인해주세요.</div>');
    }

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

    function clearMarkers() {
        markers.forEach(function (m) { m.setMap(null); });
        markers = [];
    }

    /* 픽셀 그리드 기반 간이 클러스터링 후 마커 표시 (CustomOverlay) */
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
        var el = $('<div class="map-marker">' + wooji.escapeHtml(collectionEmoji) + '</div>')
            .css('border-color', markerColor);
        el.on('click', function () { openInfoWindow(p, pos); });

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
        // 그룹 중심 좌표
        var latSum = 0, lngSum = 0;
        group.forEach(function (g) { latSum += g.pos.getLat(); lngSum += g.pos.getLng(); });
        var center = new kakao.maps.LatLng(latSum / group.length, lngSum / group.length);

        var el = $('<div class="map-cluster">' + group.length + '</div>');
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
        var html = '<div class="map-info">'
            + '<div style="font-weight:600; font-size:14px;">'
            + (CATEGORY_ICON[p.category] || '📌') + ' ' + wooji.escapeHtml(p.name) + '</div>'
            + (p.address ? '<div style="font-size:12px; color:#777; margin-top:2px;">' + wooji.escapeHtml(p.address) + '</div>' : '')
            + '<button class="btn btn-sm btn-primary" style="margin-top:8px;" onclick="openPlaceDetail(' + p.place_id + ')">상세보기</button>'
            + '</div>';
        infoWindow.setContent(html);
        infoWindow.setPosition(pos);
        infoWindow.open(map);
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
                markerColor = dominantEmojiColor(collectionEmoji);
                redrawMarkers();    // 대표 이모지/테두리색 반영
                $('#colEmoji').text(c.emoji || '📍');
                $('#colTitle').text(c.title);
                $('#colDesc').text(c.description || '');
                $('#myRole').text(myRole ? '내 권한: ' + myRole : '공개 컬렉션 (보기 전용)');

                var canEdit = myRole === 'OWNER' || myRole === 'EDITOR';
                $('#btnAddPlace').toggle(canEdit);
                $('#btnSearchPlace').toggle(canEdit);
                $('#btnShare').toggle(myRole === 'OWNER');
                $('#btnEditCol').toggle(myRole === 'OWNER');
                $('#btnMembers').toggle(!!myRole);   // 멤버 목록은 멤버만

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
                category: $('#filterCategory').val()
            },
            success: function (list) {
                places = list;
                renderPlaceList();
                redrawMarkers();
                if (fit) fitAllPlaces();
            }
        });
    }

    function renderPlaceList() {
        var html = places.map(function (p) {
            return '<div class="place-item" data-id="' + p.place_id + '">'
                + '<div class="name">' + (CATEGORY_ICON[p.category] || '📌') + ' '
                + wooji.escapeHtml(p.name) + '</div>'
                + (p.address ? '<div class="addr">' + wooji.escapeHtml(p.address) + '</div>' : '')
                + (p.tags ? '<div class="tags">#' + wooji.escapeHtml(p.tags).split(',').join(' #') + '</div>' : '')
                + '<div class="row2">'
                + (p.photo_count > 0 ? '<span>📷 ' + p.photo_count + '</span>' : '')
                + '<span>by ' + wooji.escapeHtml(p.created_by_nickname) + '</span>'
                + '</div></div>';
        }).join('');
        $('#placeList').html(html || '<p style="color:#888; font-size:13px;">등록된 장소가 없습니다.</p>');
    }

    // 목록 클릭 -> 지도 이동 + 인포윈도우
    $(document).on('click', '.place-item', function () {
        var p = places.find(function (x) { return x.place_id === $(this).data('id'); }.bind(this));
        if (!p || !mapAvailable) return;
        var pos = new kakao.maps.LatLng(Number(p.lat), Number(p.lng));
        map.setLevel(3);
        map.panTo(pos);
        openInfoWindow(p, pos);
    });

    $('#searchKeyword').on('keydown', function (e) { if (e.key === 'Enter') loadPlaces(true); });
    $('#filterCategory').on('change', function () { loadPlaces(true); });

    // 장소 추가 모드
    function setAddMode(on) {
        addMode = on;
        $('#btnAddPlace').text(on ? '지도를 클릭하세요… (취소)' : '+ 지도 클릭으로 추가');
        if (mapAvailable) map.setCursor(on ? 'crosshair' : 'auto');
    }
    $('#btnAddPlace').on('click', function () { setAddMode(!addMode); });

    // 장소 등록/수정 모달
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
                    return '<img src="' + ph.file_path + '" style="width:70px; height:70px; object-fit:cover; border-radius:8px;">';
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
                loadPlaces();
            }
        });
    });

    // 상호 검색으로 장소 추가
    var poiResults = [];

    $('#btnSearchPlace').on('click', function () {
        $('#poiResults').empty();
        $('#poiKeyword').val('');
        $('#poiModal').show();
        $('#poiKeyword').focus();
    });
    $('#btnPoiClose').on('click', function () { $('#poiModal').hide(); });

    function searchPoi() {
        var keyword = $('#poiKeyword').val().trim();
        if (!keyword) return;
        $('#poiResults').html('<p style="color:#888; font-size:13px;">검색 중…</p>');
        wooji.ajax({
            url: '/api/search/places',
            data: { keyword: keyword },
            success: function (list) {
                poiResults = list;
                if (!list.length) {
                    $('#poiResults').html('<p style="color:#888; font-size:13px;">검색 결과가 없습니다.</p>');
                    return;
                }
                var html = list.map(function (r, i) {
                    return '<div class="place-item poi-item" data-idx="' + i + '">'
                        + '<div class="name">' + (CATEGORY_ICON[r.category] || '📌') + ' '
                        + wooji.escapeHtml(r.name) + '</div>'
                        + '<div class="addr">' + wooji.escapeHtml(r.address || '') + '</div>'
                        + (r.categoryName ? '<div class="tags">' + wooji.escapeHtml(r.categoryName) + '</div>' : '')
                        + '</div>';
                }).join('');
                $('#poiResults').html(html);
            },
            error: function (msg) {
                $('#poiResults').html('<p style="color:#ef4444; font-size:13px;">' + wooji.escapeHtml(msg) + '</p>');
            }
        });
    }

    $('#btnPoiSearch').on('click', searchPoi);
    $('#poiKeyword').on('keydown', function (e) { if (e.key === 'Enter') searchPoi(); });

    // 검색 결과 선택 -> 장소 등록 모달에 자동 입력 + 지도 이동
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

    // 현재 위치
    $('#btnMyLocation').on('click', function () {
        if (!navigator.geolocation) { alert('브라우저가 위치 정보를 지원하지 않습니다.'); return; }
        navigator.geolocation.getCurrentPosition(function (pos) {
            if (mapAvailable) {
                map.setLevel(5);
                map.panTo(new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
            }
        }, function () {
            alert('위치 정보를 가져올 수 없습니다.');
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
                prompt('초대 링크가 생성되었습니다. 복사하세요:', url);
                loadInvites();
            }
        });
    });

    function loadInvites() {
        wooji.ajax({
            url: '/api/collections/' + COLLECTION_ID + '/invites',
            success: function (list) {
                var html = list.map(function (i) {
                    var active = i.active_yn === 'Y';
                    var expired = i.expires_at && new Date(i.expires_at) < new Date();
                    var status = !active ? '취소됨' : (expired ? '만료됨' : '활성');
                    return '<div class="member-row">'
                        + '<div><b>' + i.role + '</b> · ' + status
                        + '<br><span style="color:#888; font-size:11px;">' + location.origin + '/invite/' + i.invite_code + '</span></div>'
                        + (active && !expired
                            ? '<button class="btn btn-sm btn-danger cancel-invite" data-id="' + i.invite_id + '">취소</button>'
                            : '')
                        + '</div>';
                }).join('');
                $('#inviteList').html(html || '<p style="color:#888;">발급된 링크가 없습니다.</p>');
            }
        });
    }

    $(document).on('click', '.cancel-invite', function () {
        wooji.ajax({
            url: '/api/invites/' + $(this).data('id'),
            method: 'DELETE',
            success: loadInvites
        });
    });

    // 멤버/권한
    $('#btnMembers').on('click', function () { loadMembers(); $('#memberModal').show(); });
    $('#btnMemberClose').on('click', function () { $('#memberModal').hide(); });

    function loadMembers() {
        wooji.ajax({
            url: '/api/collections/' + COLLECTION_ID + '/members',
            success: function (list) {
                var html = list.map(function (m) {
                    var isMe = user && m.user_id === user.userId;
                    var right = '';
                    if (myRole === 'OWNER' && m.role !== 'OWNER') {
                        right = '<span>'
                            + '<select class="role-select" data-id="' + m.user_id + '" style="padding:4px; font-size:12px;">'
                            + '<option value="EDITOR"' + (m.role === 'EDITOR' ? ' selected' : '') + '>Editor</option>'
                            + '<option value="VIEWER"' + (m.role === 'VIEWER' ? ' selected' : '') + '>Viewer</option>'
                            + '</select> '
                            + '<button class="btn btn-sm btn-danger remove-member" data-id="' + m.user_id + '">내보내기</button>'
                            + '</span>';
                    } else if (isMe && m.role !== 'OWNER') {
                        right = '<button class="btn btn-sm remove-member" data-id="' + m.user_id + '">나가기</button>';
                    } else {
                        right = '<span class="badge badge-owner">' + m.role + '</span>';
                    }
                    return '<div class="member-row">'
                        + '<div>' + wooji.escapeHtml(m.nickname) + (isMe ? ' (나)' : '')
                        + '<br><span style="color:#888; font-size:11px;">' + wooji.escapeHtml(m.email) + '</span></div>'
                        + right + '</div>';
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

    // 댓글
    $('#btnComments').on('click', function () { loadComments(); $('#commentModal').show(); });
    $('#btnCommentClose').on('click', function () { $('#commentModal').hide(); });

    function loadComments() {
        wooji.ajax({
            url: '/api/collections/' + COLLECTION_ID + '/comments',
            success: function (list) {
                var html = list.map(function (c) {
                    var isMine = user && c.user_id === user.userId;
                    return '<div class="comment">'
                        + '<div><span class="who">' + wooji.escapeHtml(c.nickname) + '</span>'
                        + '<span class="when">' + (c.created_at || '') + '</span></div>'
                        + '<div class="content">' + wooji.escapeHtml(c.content) + '</div>'
                        + '<div class="actions">'
                        + '<span class="like-comment" data-id="' + c.comment_id + '">'
                        + (c.liked_by_me > 0 ? '❤️' : '🤍') + ' ' + c.like_count + '</span>'
                        + (isMine ? '<span class="edit-comment" data-id="' + c.comment_id + '">수정</span>'
                                  + '<span class="del-comment" data-id="' + c.comment_id + '">삭제</span>' : '')
                        + '</div></div>';
                }).join('');
                $('#commentList').html(html || '<p style="color:#888; font-size:13px;">첫 댓글을 남겨보세요!</p>');
            }
        });
    }

    $('#btnCommentAdd').on('click', function () {
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
    });

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
