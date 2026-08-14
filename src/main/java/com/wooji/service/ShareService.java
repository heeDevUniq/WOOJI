package com.wooji.service;

import java.sql.Timestamp;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wooji.common.ApiException;
import com.wooji.common.PermissionChecker;
import com.wooji.mapper.MemberMapper;
import com.wooji.mapper.ShareMapper;

@Service
public class ShareService {

    private final ShareMapper shareMapper;
    private final MemberMapper memberMapper;
    private final PermissionChecker permission;

    public ShareService(ShareMapper shareMapper, MemberMapper memberMapper, PermissionChecker permission) {
        this.shareMapper = shareMapper;
        this.memberMapper = memberMapper;
        this.permission = permission;
    }

    /** 초대 링크 생성 (OWNER). expiresInHours 없으면 무기한 */
    @Transactional
    public Map<String, Object> createInvite(Long userId, Long collectionId, Map<String, Object> param) {
        permission.checkOwner(collectionId, userId);

        String role = (String) param.get("role");
        if (role == null || (!"EDITOR".equals(role) && !"VIEWER".equals(role))) {
            role = "VIEWER";
        }

        Map<String, Object> invite = new HashMap<>();
        invite.put("collectionId", collectionId);
        invite.put("inviteCode", UUID.randomUUID().toString().replace("-", ""));
        invite.put("role", role);
        invite.put("createdBy", userId);

        Object hours = param.get("expiresInHours");
        if (hours != null) {
            long ms = (long) (Double.parseDouble(hours.toString()) * 3600_000L);
            invite.put("expiresAt", new Timestamp(System.currentTimeMillis() + ms));
        } else {
            invite.put("expiresAt", null);
        }

        shareMapper.insertInvite(invite);
        invite.put("shareUrl", "/invite/" + invite.get("inviteCode"));
        return invite;
    }

    /** 초대 링크 목록 (OWNER) */
    public List<Map<String, Object>> getInvites(Long userId, Long collectionId) {
        permission.checkOwner(collectionId, userId);
        return shareMapper.selectInvites(collectionId);
    }

    /** 공유 취소 (OWNER) */
    @Transactional
    public void cancelInvite(Long userId, Long inviteId) {
        Map<String, Object> invite = shareMapper.selectInvite(inviteId);
        if (invite == null) {
            throw new ApiException(404, "초대를 찾을 수 없습니다.");
        }
        Long collectionId = ((Number) invite.get("collection_id")).longValue();
        permission.checkOwner(collectionId, userId);
        shareMapper.deactivateInvite(inviteId);
    }

    /**
     * 초대 코드 정보 조회 (수락 화면용).
     * 아직 멤버가 아닌 사용자가 열람하면 '받은 초대'로 기록해 메인 배너에 노출한다.
     */
    @Transactional
    public Map<String, Object> getInviteByCode(Long userId, String inviteCode) {
        Map<String, Object> invite = shareMapper.selectInviteByCode(inviteCode);
        validateInvite(invite);

        if (userId != null) {
            Long collectionId = ((Number) invite.get("collection_id")).longValue();
            if (memberMapper.selectRole(collectionId, userId) == null) {
                shareMapper.insertPendingInvite(((Number) invite.get("invite_id")).longValue(), userId);
            }
        }
        return invite;
    }

    /** 내가 받은 대기 중 초대 목록 (메인 배너용) */
    public List<Map<String, Object>> getPendingInvites(Long userId) {
        return shareMapper.selectPendingInvites(userId);
    }

    /** 초대 수락 → 멤버 등록 */
    @Transactional
    public Map<String, Object> acceptInvite(Long userId, String inviteCode) {
        Map<String, Object> invite = shareMapper.selectInviteByCode(inviteCode);
        validateInvite(invite);

        Long collectionId = ((Number) invite.get("collection_id")).longValue();

        String existingRole = memberMapper.selectRole(collectionId, userId);
        if (existingRole == null) {
            Map<String, Object> memberParam = new HashMap<>();
            memberParam.put("collectionId", collectionId);
            memberParam.put("userId", userId);
            memberParam.put("role", invite.get("role"));
            memberMapper.insertMember(memberParam);
        }
        shareMapper.deletePendingInvite(collectionId, userId);   // 수락했으므로 배너에서 제거

        Map<String, Object> result = new HashMap<>();
        result.put("collectionId", collectionId);
        result.put("role", existingRole != null ? existingRole : invite.get("role"));
        return result;
    }

    private void validateInvite(Map<String, Object> invite) {
        if (invite == null || !"Y".equals(invite.get("active_yn"))) {
            throw new ApiException(404, "유효하지 않은 초대 링크입니다.");
        }
        Object expiresAt = invite.get("expires_at");
        if (expiresAt instanceof Timestamp && ((Timestamp) expiresAt).before(new Timestamp(System.currentTimeMillis()))) {
            throw new ApiException(410, "만료된 초대 링크입니다.");
        }
    }
    
}
