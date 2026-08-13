package com.wooji.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wooji.common.ApiException;
import com.wooji.common.PermissionChecker;
import com.wooji.mapper.CommentMapper;

@Service
public class CommentService {

    private final CommentMapper commentMapper;
    private final PermissionChecker permission;

    public CommentService(CommentMapper commentMapper, PermissionChecker permission) {
        this.commentMapper = commentMapper;
        this.permission = permission;
    }

    /* 댓글 목록 (VIEWER 이상) */
    public List<Map<String, Object>> getComments(Long userId, Long collectionId) {
        permission.checkViewer(collectionId, userId);
        return commentMapper.selectComments(collectionId, userId);
    }

    /* 댓글 작성 (VIEWER 이상 - 멤버면 누구나) */
    @Transactional
    public Map<String, Object> create(Long userId, Long collectionId, Map<String, Object> param) {
        permission.checkViewer(collectionId, userId);
        if (param.get("content") == null || ((String) param.get("content")).trim().isEmpty()) {
            throw new ApiException(400, "내용을 입력하세요.");
        }
        param.put("collectionId", collectionId);
        param.put("userId", userId);
        commentMapper.insertComment(param);
        return commentMapper.selectComment(((Number) param.get("commentId")).longValue());
    }

    /* 댓글 수정 (작성자 본인만) */
    @Transactional
    public void update(Long userId, Long commentId, Map<String, Object> param) {
        checkAuthor(userId, commentId);
        param.put("commentId", commentId);
        commentMapper.updateComment(param);
    }

    /* 댓글 삭제 (작성자 본인만) */
    @Transactional
    public void delete(Long userId, Long commentId) {
        checkAuthor(userId, commentId);
        commentMapper.deleteComment(commentId);
    }

    /* 좋아요 토글 */
    @Transactional
    public Map<String, Object> toggleLike(Long userId, Long commentId) {
        Map<String, Object> comment = commentMapper.selectComment(commentId);
        if (comment == null) {
            throw new ApiException(404, "댓글을 찾을 수 없습니다.");
        }
        Long collectionId = ((Number) comment.get("collection_id")).longValue();
        permission.checkViewer(collectionId, userId);

        boolean liked;
        if (commentMapper.countLike(commentId, userId) > 0) {
            commentMapper.deleteLike(commentId, userId);
            liked = false;
        } else {
            commentMapper.insertLike(commentId, userId);
            liked = true;
        }
        Map<String, Object> result = new HashMap<>();
        result.put("liked", liked);
        return result;
    }

    private void checkAuthor(Long userId, Long commentId) {
        Map<String, Object> comment = commentMapper.selectComment(commentId);
        if (comment == null) {
            throw new ApiException(404, "댓글을 찾을 수 없습니다.");
        }
        if (!userId.equals(((Number) comment.get("user_id")).longValue())) {
            throw new ApiException(403, "본인 댓글만 수정/삭제할 수 있습니다.");
        }
    }
    
}
