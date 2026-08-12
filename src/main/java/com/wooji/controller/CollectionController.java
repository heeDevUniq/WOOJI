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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.wooji.common.Res;
import com.wooji.service.CollectionService;

@RestController
@RequestMapping("/api/collections")
public class CollectionController {

    private final CollectionService collectionService;

    public CollectionController(CollectionService collectionService) {
        this.collectionService = collectionService;
    }

    private Long userId(HttpServletRequest request) {
        return (Long) request.getAttribute("userId");
    }

    /* 내 컬렉션 목록 */
    @GetMapping
    public Map<String, Object> myCollections(HttpServletRequest request) {
        return Res.ok(collectionService.getMyCollections(userId(request)));
    }

    /* 공개 컬렉션 목록 */
    @GetMapping("/public")
    public Map<String, Object> publicCollections(@RequestParam(required = false) String keyword) {
        return Res.ok(collectionService.getPublicCollections(keyword));
    }

    /* 컬렉션 상세 */
    @GetMapping("/{collectionId}")
    public Map<String, Object> get(HttpServletRequest request, @PathVariable Long collectionId) {
        return Res.ok(collectionService.get(userId(request), collectionId));
    }

    /* 컬렉션 생성 */
    @PostMapping
    public Map<String, Object> create(HttpServletRequest request, @RequestBody Map<String, Object> param) {
        return Res.ok(collectionService.create(userId(request), param));
    }

    /* 컬렉션 수정 */
    @PutMapping("/{collectionId}")
    public Map<String, Object> update(HttpServletRequest request, @PathVariable Long collectionId, @RequestBody Map<String, Object> param) {
        collectionService.update(userId(request), collectionId, param);
        return Res.ok();
    }

    /* 컬렉션 삭제 */
    @DeleteMapping("/{collectionId}")
    public Map<String, Object> delete(HttpServletRequest request, @PathVariable Long collectionId) {
        collectionService.delete(userId(request), collectionId);
        return Res.ok();
    }

    /* 즐겨찾기 토글 */
    @PostMapping("/{collectionId}/favorite")
    public Map<String, Object> toggleFavorite(HttpServletRequest request, @PathVariable Long collectionId) {
        return Res.ok(collectionService.toggleFavorite(userId(request), collectionId));
    }

    /* 복제 */
    @PostMapping("/{collectionId}/clone")
    public Map<String, Object> clone(HttpServletRequest request, @PathVariable Long collectionId) {
        return Res.ok(collectionService.clone(userId(request), collectionId));
    }
    
}
