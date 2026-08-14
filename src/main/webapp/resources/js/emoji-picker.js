/**
 * 이모지 선택기 (Windows Win+. 피커 스타일)
 * 사용법: emojiPicker.attach('#inputSelector');
 */
var emojiPicker = (function ($) {
    var CATEGORIES = [
        { icon: '😀', name: '표정',
          ranges: [[0x1F600, 0x1F64F], [0x1F910, 0x1F92F], [0x1F970, 0x1F97A], [0x1FAE0, 0x1FAE8]] },
        { icon: '🧑', name: '사람·손',
          ranges: [[0x1F440, 0x1F450], [0x1F464, 0x1F487], [0x1F930, 0x1F93E], [0x1F9B0, 0x1F9DF], [0x1FAF0, 0x1FAF8]] },
        { icon: '🐶', name: '동물·자연',
          ranges: [[0x1F330, 0x1F344], [0x1F400, 0x1F43F], [0x1F980, 0x1F9AE], [0x1FAB0, 0x1FABD]] },
        { icon: '🍔', name: '음식',
          ranges: [[0x1F345, 0x1F37F], [0x1F950, 0x1F96F], [0x1F9C0, 0x1F9CB], [0x1FAD0, 0x1FADB]] },
        { icon: '⚽', name: '활동·스포츠',
          ranges: [[0x26BD, 0x26BE], [0x1F3A0, 0x1F3CA], [0x1F3CF, 0x1F3D3], [0x1F3F8, 0x1F3FA], [0x1F945, 0x1F94F], [0x1F6F7, 0x1F6FC]] },
        { icon: '🚗', name: '여행·장소',
          ranges: [[0x1F30D, 0x1F32C], [0x1F3D4, 0x1F3F0], [0x1F5FA, 0x1F5FF], [0x1F680, 0x1F6EC], [0x1F6F3, 0x1F6F6]] },
        { icon: '💡', name: '사물',
          ranges: [[0x231A, 0x231B], [0x1F4A0, 0x1F4FD], [0x1F507, 0x1F53D], [0x1F550, 0x1F567], [0x1F6CB, 0x1F6D2], [0x1F9E0, 0x1F9FF], [0x1FA70, 0x1FAA8]] },
        { icon: '❤️', name: '기호',
          chars: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎',
                  '💓', '💔', '💕', '💖', '💗', '💘', '💝', '💞', '💟', '❣️',
                  '⭐', '✨', '☀️', '☁️', '⛅', '⛈️', '❄️', '☃️', '⛄', '☔', '⚡',
                  '✅', '✔️', '☑️', '❌', '❎', '✖️', '➕', '➖', '➗',
                  '❓', '❔', '❕', '❗', '‼️', '⁉️', '⚠️', '⛔', '⭕',
                  '♠️', '♥️', '♦️', '♣️',
                  '⬆️', '⬇️', '⬅️', '➡️', '↗️', '↘️', '↙️', '↖️', '↔️', '↕️', '↩️', '↪️',
                  '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '⛎',
                  '♨️', '♻️', '⚓', '⚖️', '⚙️', '⚔️'] },
        { icon: '🚩', name: '깃발',
          chars: ['🏁', '🚩', '🎌', '🏴', '🏳️'] }
    ];

    var $panel = null;
    var $target = null;
    var pending = null;    // 확인 전 선택된 이모지

    function toEmoji(cp) {
        var s = String.fromCodePoint(cp);
        return cp < 0x10000 ? s + '\uFE0F' : s;
    }

    function build() {
        var tabs = [], body = [];
        CATEGORIES.forEach(function (cat, i) {
            tabs.push('<button type="button" class="ep-tab" data-idx="' + i + '" title="' + cat.name + '">' + cat.icon + '</button>');

            var cells = [];
            if (cat.chars) {
                cat.chars.forEach(function (ch) {
                    cells.push('<span class="ep-emoji">' + ch + '</span>');
                });
            } else {
                cat.ranges.forEach(function (r) {
                    for (var cp = r[0]; cp <= r[1]; cp++) {
                        cells.push('<span class="ep-emoji">' + toEmoji(cp) + '</span>');
                    }
                });
            }
            body.push('<div class="ep-section" data-idx="' + i + '">'
                + '<div class="ep-title">' + cat.name + '</div>' + cells.join('') + '</div>');
        });

        $panel = $('<div class="emoji-picker" style="display:none;">'
            + '<div class="ep-tabs">' + tabs.join('') + '</div>'
            + '<div class="ep-body">' + body.join('') + '</div>'
            + '<div class="ep-foot">'
            + '<span class="ep-sel"></span>'
            + '<span class="ep-msg">대표 이모지를 선택해주세요</span>'
            + '<button type="button" class="ep-confirm" disabled>확인</button>'
            + '</div></div>').appendTo('body');

        // 이모지 선택 -> 하단 바에 반영
        $panel.on('click', '.ep-emoji', function () {
            $panel.find('.ep-emoji').removeClass('ep-selected');
            $(this).addClass('ep-selected');
            pending = $(this).text();
            $panel.find('.ep-sel').text(pending);
            $panel.find('.ep-msg').text('선택됨 — 지도 마커로 사용돼요');
            $panel.find('.ep-confirm').prop('disabled', false);
            $panel.find('.ep-foot').addClass('show');
        });

        // 확인 -> 입력에 반영
        $panel.on('click', '.ep-confirm', function () {
            if ($target && pending) {
                $target.val(pending).trigger('change');
            }
            hide();
        });

        // 카테고리 탭 -> 해당 섹션으로 스크롤
        $panel.on('click', '.ep-tab', function () {
            var $section = $panel.find('.ep-section[data-idx="' + $(this).data('idx') + '"]');
            var $body = $panel.find('.ep-body');
            $body.scrollTop($body.scrollTop() + $section.position().top - 4);
        });

        // 바깥 클릭 시 닫기
        $(document).on('mousedown', function (e) {
            if ($panel.is(':visible')
                    && !$(e.target).closest('.emoji-picker').length
                    && !($target && $target.is(e.target))) {
                hide();
            }
        });
    }

    function show($input) {
        if (!$panel) build();
        $target = $input;

        // 하단 바는 항상 표시 - 선택 전에는 안내 문구
        pending = null;
        $panel.find('.ep-emoji').removeClass('ep-selected');
        $panel.find('.ep-sel').text('');
        $panel.find('.ep-msg').text('대표 이모지를 선택해주세요');
        $panel.find('.ep-confirm').prop('disabled', true);
        $panel.find('.ep-foot').removeClass('show');

        var off = $input.offset();
        $panel.css({ top: off.top + $input.outerHeight() + 4, left: off.left }).show();
        $panel.find('.ep-body').scrollTop(0);
    }

    function hide() {
        if ($panel) $panel.hide();
    }

    /* input을 이모지 선택 전용으로 전환 */
    function attach(selector) {
        $(selector).attr('readonly', true).addClass('ep-input');
        $(document).on('click', selector, function () {
            show($(this));
        });
        if (!$panel) {
            if (window.requestIdleCallback) {
                requestIdleCallback(function () { if (!$panel) build(); });
            } else {
                setTimeout(function () { if (!$panel) build(); }, 200);
            }
        }
    }

    return { attach: attach, hide: hide };

})(jQuery);
