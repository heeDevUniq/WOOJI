package com.wooji.controller;

import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wooji.common.Res;
import com.wooji.service.MemberService;
import com.wooji.service.ShareService;

@RestController
@RequestMapping("/api")
public class ShareController {

    private final ShareService shareService;
    private final MemberService memberService;

    public ShareController(ShareService shareService, MemberService memberService) {
        this.shareService = shareService;
        this.memberService = memberService;
    }

    private Long userId(HttpServletRequest request) {
        return (Long) request.getAttribute("userId");
    }

    // 공유(초대)

    /* 초대 링크 생성 { role, expiresInHours } */
    @PostMapping("/collections/{collectionId}/invites")
    public Map<String, Object> createInvite(HttpServletRequest request, @PathVariable Long collectionId, @RequestBody(required = false) Map<String, Object> param) {
        return Res.ok(shareService.createInvite(userId(request), collectionId, param == null ? new java.util.HashMap<String, Object>() : param));
    }

    /* 초대 링크 목록 */
    @GetMapping("/collections/{collectionId}/invites")
    public Map<String, Object> invites(HttpServletRequest request, @PathVariable Long collectionId) {
        return Res.ok(shareService.getInvites(userId(request), collectionId));
    }

    /* 공유 취소 */
    @DeleteMapping("/invites/{inviteId}")
    public Map<String, Object> cancelInvite(HttpServletRequest request, @PathVariable Long inviteId) {
        shareService.cancelInvite(userId(request), inviteId);
        return Res.ok();
    }

    /* 초대 코드 정보 조회 */
    @GetMapping("/invites/code/{inviteCode}")
    public Map<String, Object> inviteInfo(HttpServletRequest request, @PathVariable String inviteCode) {
        return Res.ok(shareService.getInviteByCode(userId(request), inviteCode));
    }

    /* 내가 받은 대기 중 초대 목록 (메인 배너) */
    @GetMapping("/invites/pending")
    public Map<String, Object> pendingInvites(HttpServletRequest request) {
        return Res.ok(shareService.getPendingInvites(userId(request)));
    }

    /* 초대 수락 */
    @PostMapping("/invites/code/{inviteCode}/accept")
    public Map<String, Object> acceptInvite(HttpServletRequest request, @PathVariable String inviteCode) {
        return Res.ok(shareService.acceptInvite(userId(request), inviteCode));
    }

    // 권한(멤버)

    /* 멤버/권한 목록 */
    @GetMapping("/collections/{collectionId}/members")
    public Map<String, Object> members(HttpServletRequest request, @PathVariable Long collectionId) {
        return Res.ok(memberService.getMembers(userId(request), collectionId));
    }

    /* 권한 변경 { role: EDITOR|VIEWER } */
    @PutMapping("/collections/{collectionId}/members/{targetUserId}")
    public Map<String, Object> changeRole(HttpServletRequest request, @PathVariable Long collectionId, @PathVariable Long targetUserId, @RequestBody Map<String, Object> param) {
        memberService.changeRole(userId(request), collectionId, targetUserId, param);
        return Res.ok();
    }

    /* 멤버 삭제(내보내기/나가기) */
    @DeleteMapping("/collections/{collectionId}/members/{targetUserId}")
    public Map<String, Object> removeMember(HttpServletRequest request, @PathVariable Long collectionId, @PathVariable Long targetUserId) {
        memberService.removeMember(userId(request), collectionId, targetUserId);
        return Res.ok();
    }
    
}
