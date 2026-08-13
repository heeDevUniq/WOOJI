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
import com.wooji.service.CommentService;

@RestController
@RequestMapping("/api")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    private Long userId(HttpServletRequest request) {
        return (Long) request.getAttribute("userId");
    }

    /* 컬렉션 댓글 목록 */
    @GetMapping("/collections/{collectionId}/comments")
    public Map<String, Object> list(HttpServletRequest request, @PathVariable Long collectionId) {
        return Res.ok(commentService.getComments(userId(request), collectionId));
    }

    /* 댓글 작성 */
    @PostMapping("/collections/{collectionId}/comments")
    public Map<String, Object> create(HttpServletRequest request, @PathVariable Long collectionId,
                                      @RequestBody Map<String, Object> param) {
        return Res.ok(commentService.create(userId(request), collectionId, param));
    }

    /* 댓글 수정 */
    @PutMapping("/comments/{commentId}")
    public Map<String, Object> update(HttpServletRequest request, @PathVariable Long commentId,
                                      @RequestBody Map<String, Object> param) {
        commentService.update(userId(request), commentId, param);
        return Res.ok();
    }

    /* 댓글 삭제 */
    @DeleteMapping("/comments/{commentId}")
    public Map<String, Object> delete(HttpServletRequest request, @PathVariable Long commentId) {
        commentService.delete(userId(request), commentId);
        return Res.ok();
    }

    /* 좋아요 토글 */
    @PostMapping("/comments/{commentId}/like")
    public Map<String, Object> toggleLike(HttpServletRequest request, @PathVariable Long commentId) {
        return Res.ok(commentService.toggleLike(userId(request), commentId));
    }
    
}
