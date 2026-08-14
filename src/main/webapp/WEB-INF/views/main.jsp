<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>우지 : 우리들의 지도</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/svg+xml" href="/resources/img/favicon.svg?v=1">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
    <link rel="stylesheet" href="/resources/css/wooji.css?v=20260837">
</head>
<body class="map-page">
<div id="map"></div>

<!-- 좌상단: 로고 + 검색 -->
<div class="float-top-left">
    <a href="/main" class="float-card logo-card logo-mark">
        <span class="logo-pin">
            <svg viewBox="0 0 24 26" width="26" height="28"><path fill="#3182F6" d="M12 1C6.5 1 2 5.4 2 10.8c0 6.6 8 13.3 9.1 14.2.5.4 1.3.4 1.8 0 1.1-.9 9.1-7.6 9.1-14.2C22 5.4 17.5 1 12 1z"/><circle cx="12" cy="10.6" r="5.6" fill="#fff"/></svg>
            <span class="logo-emoji">✈️</span>
            <span class="logo-dot"></span>
        </span>
        WOOJI
    </a>
    <div class="search-wrap">
        <div class="float-card search-card">
            <span id="btnTopSearch" style="cursor:pointer;">🔍</span>
            <input type="text" id="topSearch" placeholder="장소 검색">
        </div>
        <div class="float-card search-results" id="placeResults"></div>
    </div>
</div>

<!-- 좌하단: 지도 컨트롤 -->
<div class="map-ctrl">
    <button id="btnZoomIn" title="확대">＋</button>
    <button id="btnZoomOut" title="축소">－</button>
    <button id="btnMyLocation" title="현재 위치">🧭</button>
</div>

<!-- 모바일 햄버거 + 백드롭 -->
<button class="btn-menu-float" id="btnPanel" title="컬렉션 목록">☰</button>
<div class="panel-backdrop" id="panelBackdrop"></div>

<!-- 패널 다시 열기 (데스크톱, 접었을 때만 표시) -->
<button class="panel-restore" id="btnRestore" title="패널 열기">«</button>

<!-- 모바일 하단 컬렉션 칩 바 -->
<div class="chip-bar" id="chipBar"></div>

<!-- 우측 패널 -->
<div class="float-panel">
    <div class="panel-head">
        <div class="panel-title">
            우리들의 지도
            <span style="display:flex; align-items:center; gap:6px;">
                <span id="userArea"></span>
                <button class="panel-collapse" id="btnCollapse" title="패널 접기">»</button>
            </span>
        </div>
        <div class="tabs">
            <button class="tab active" data-tab="my">내 컬렉션</button>
            <button class="tab" data-tab="explore">둘러보기</button>
        </div>
        <div id="exploreSearchRow" style="display:none; margin-top:12px;">
            <input type="text" id="colSearch" placeholder="컬렉션 검색"
                   style="width:100%; border:1.5px solid var(--line); border-radius:12px; padding:9px 14px; outline:none; font-size:13px;">
        </div>
    </div>
    <div class="panel-body">
        <div id="myList"></div>
        <div id="exploreList" style="display:none;"></div>
    </div>
    <div class="panel-foot" style="flex-direction:column; align-items:stretch;">
        <div id="inviteBanners"></div>
        <button class="btn btn-primary btn-big" id="btnNew">+ 새 컬렉션 만들기</button>
    </div>
</div>

<!-- 컬렉션 생성 모달 -->
<div class="modal-back" id="colModal">
    <div class="modal">
        <h3 id="colModalTitle">새 컬렉션</h3>
        <input type="hidden" id="colId">
        <div class="form-group">
            <label>대표 이모지 (클릭해서 선택)</label>
            <input type="text" id="colEmoji" value="📍">
        </div>
        <div class="form-group">
            <label>제목 *</label>
            <input type="text" id="colTitle" placeholder="예: 성수 카페 털기">
        </div>
        <div class="form-group">
            <label>설명</label>
            <textarea id="colDesc" rows="2" placeholder="어떤 지도인가요?"></textarea>
        </div>
        <div class="form-group">
            <label>카테고리</label>
            <select id="colCategory">
                <option value="FOOD">맛집</option>
                <option value="TRAVEL">여행</option>
                <option value="CAFE">카페</option>
                <option value="ACTIVITY">액티비티</option>
                <option value="ETC">기타</option>
            </select>
        </div>
        <div class="form-group">
            <label><input type="checkbox" id="colPublic" style="width:auto;"> 공개 컬렉션으로 설정</label>
        </div>
        <div class="btn-row">
            <button class="btn" id="btnColCancel">취소</button>
            <button class="btn btn-primary" id="btnColSave">만들기</button>
        </div>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoMapJsKey}&libraries=services"></script>
<script src="/resources/js/common.js?v=20260837"></script>
<script src="/resources/js/emoji-picker.js?v=20260837"></script>
<script src="/resources/js/main.js?v=20260837"></script>
</body>
</html>
