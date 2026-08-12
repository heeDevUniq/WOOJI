package com.wooji.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wooji.common.ApiException;
import com.wooji.common.PermissionChecker;
import com.wooji.mapper.MemberMapper;

@Service
public class MemberService {

    private final MemberMapper memberMapper;
    private final PermissionChecker permission;

    public MemberService(MemberMapper memberMapper, PermissionChecker permission) {
        this.memberMapper = memberMapper;
        this.permission = permission;
    }

    /* 멤버(권한) 목록 조회 (VIEWER 이상) */
    public List<Map<String, Object>> getMembers(Long userId, Long collectionId) {
        permission.checkViewer(collectionId, userId);
        return memberMapper.selectMembers(collectionId);
    }

    /* 권한 변경 (OWNER). OWNER 권한 자체는 변경 불가 */
    @Transactional
    public void changeRole(Long userId, Long collectionId, Long targetUserId, Map<String, Object> param) {
        permission.checkOwner(collectionId, userId);

        String targetRole = memberMapper.selectRole(collectionId, targetUserId);
        if (targetRole == null) {
            throw new ApiException(404, "멤버가 아닙니다.");
        }
        if ("OWNER".equals(targetRole)) {
            throw new ApiException(400, "소유자의 권한은 변경할 수 없습니다.");
        }

        String role = (String) param.get("role");
        if (!"EDITOR".equals(role) && !"VIEWER".equals(role)) {
            throw new ApiException(400, "role은 EDITOR 또는 VIEWER만 가능합니다.");
        }

        param.put("collectionId", collectionId);
        param.put("userId", targetUserId);
        memberMapper.updateMemberRole(param);
    }

    /* 멤버 삭제 (OWNER가 내보내기, 또는 본인이 나가기). OWNER는 삭제 불가 */
    @Transactional
    public void removeMember(Long userId, Long collectionId, Long targetUserId) {
        String targetRole = memberMapper.selectRole(collectionId, targetUserId);
        if (targetRole == null) {
            throw new ApiException(404, "멤버가 아닙니다.");
        }
        if ("OWNER".equals(targetRole)) {
            throw new ApiException(400, "소유자는 컬렉션에서 나갈 수 없습니다. 컬렉션을 삭제하세요.");
        }
        if (!userId.equals(targetUserId)) {
            permission.checkOwner(collectionId, userId);
        }
        memberMapper.deleteMember(collectionId, targetUserId);
    }
}
