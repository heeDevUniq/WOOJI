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
import org.springframework.web.multipart.MultipartFile;

import com.wooji.common.Res;
import com.wooji.service.PlaceService;

@RestController
@RequestMapping("/api")
public class PlaceController {

    private final PlaceService placeService;

    public PlaceController(PlaceService placeService) {
        this.placeService = placeService;
    }

    private Long userId(HttpServletRequest request) {
        return (Long) request.getAttribute("userId");
    }

    /* 장소 목록/검색 (?keyword=&category=&visitedYn=) */
    @GetMapping("/collections/{collectionId}/places")
    public Map<String, Object> list(HttpServletRequest request, @PathVariable Long collectionId, @RequestParam(required = false) String keyword, @RequestParam(required = false) String category, @RequestParam(required = false) String visitedYn) {
        return Res.ok(placeService.getPlaces(userId(request), collectionId, keyword, category, visitedYn));
    }

    /* 반경 검색 (?lat=&lng=&radiusM=) */
    @GetMapping("/collections/{collectionId}/places/nearby")
    public Map<String, Object> nearby(HttpServletRequest request, @PathVariable Long collectionId, @RequestParam double lat, @RequestParam double lng, @RequestParam(defaultValue = "1000") double radiusM) {
        return Res.ok(placeService.getPlacesNearby(userId(request), collectionId, lat, lng, radiusM));
    }

    /* 장소 등록 */
    @PostMapping("/collections/{collectionId}/places")
    public Map<String, Object> create(HttpServletRequest request, @PathVariable Long collectionId, @RequestBody Map<String, Object> param) {
        return Res.ok(placeService.create(userId(request), collectionId, param));
    }

    /* 장소 상세 */
    @GetMapping("/places/{placeId}")
    public Map<String, Object> get(HttpServletRequest request, @PathVariable Long placeId) {
        return Res.ok(placeService.get(userId(request), placeId));
    }

    /* 장소 수정 */
    @PutMapping("/places/{placeId}")
    public Map<String, Object> update(HttpServletRequest request, @PathVariable Long placeId,
                                      @RequestBody Map<String, Object> param) {
        placeService.update(userId(request), placeId, param);
        return Res.ok();
    }

    /* 장소 삭제 */
    @DeleteMapping("/places/{placeId}")
    public Map<String, Object> delete(HttpServletRequest request, @PathVariable Long placeId) {
        placeService.delete(userId(request), placeId);
        return Res.ok();
    }

    /* 사진 업로드 */
    @PostMapping("/places/{placeId}/photos")
    public Map<String, Object> addPhoto(HttpServletRequest request, @PathVariable Long placeId, @RequestParam("file") MultipartFile file) {
        return Res.ok(placeService.addPhoto(userId(request), placeId, file));
    }

    /* 사진 삭제 */
    @DeleteMapping("/places/{placeId}/photos/{photoId}")
    public Map<String, Object> deletePhoto(HttpServletRequest request, @PathVariable Long placeId, @PathVariable Long photoId) {
        placeService.deletePhoto(userId(request), placeId, photoId);
        return Res.ok();
    }
    
}
