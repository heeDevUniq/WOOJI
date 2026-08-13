package com.wooji.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.wooji.common.ApiException;
import com.wooji.common.PermissionChecker;
import com.wooji.mapper.PlaceMapper;

@Service
public class PlaceService {

    private final PlaceMapper placeMapper;
    private final PermissionChecker permission;
    private final UserService userService;   // 파일 저장 재사용

    public PlaceService(PlaceMapper placeMapper, PermissionChecker permission, UserService userService) {
        this.placeMapper = placeMapper;
        this.permission = permission;
        this.userService = userService;
    }

    /* 장소 등록 (EDITOR 이상) */
    @Transactional
    public Map<String, Object> create(Long userId, Long collectionId, Map<String, Object> param) {
        permission.checkEditor(collectionId, userId);
        if (param.get("name") == null || param.get("lat") == null || param.get("lng") == null) {
            throw new ApiException(400, "장소명과 좌표(lat/lng)는 필수입니다.");
        }
        param.put("collectionId", collectionId);
        param.put("createdBy", userId);
        if (param.get("visitedYn") == null) param.put("visitedYn", "N");
        placeMapper.insertPlace(param);

        Long placeId = ((Number) param.get("placeId")).longValue();
        return placeMapper.selectPlace(placeId);
    }

    /* 장소 목록/검색 (VIEWER 이상, 공개 컬렉션은 CollectionService에서 별도 처리) */
    public List<Map<String, Object>> getPlaces(Long userId, Long collectionId,
                                               String keyword, String category, String visitedYn) {
        permission.checkViewer(collectionId, userId);

        Map<String, Object> param = new HashMap<>();
        param.put("collectionId", collectionId);
        param.put("keyword", keyword);
        param.put("category", category);
        param.put("visitedYn", visitedYn);
        return placeMapper.selectPlaces(param);
    }

    /* 반경 검색 (미터) */
    public List<Map<String, Object>> getPlacesNearby(Long userId, Long collectionId,
                                                     double lat, double lng, double radiusM) {
        permission.checkViewer(collectionId, userId);

        Map<String, Object> param = new HashMap<>();
        param.put("collectionId", collectionId);
        param.put("lat", lat);
        param.put("lng", lng);
        param.put("radiusM", radiusM);
        return placeMapper.selectPlacesNearby(param);
    }

    /* 장소 상세 */
    public Map<String, Object> get(Long userId, Long placeId) {
        Map<String, Object> place = findPlace(placeId);
        permission.checkViewer(collectionIdOf(place), userId);
        place.put("photos", placeMapper.selectPhotos(placeId));
        return place;
    }

    /* 장소 수정 (EDITOR 이상) */
    @Transactional
    public void update(Long userId, Long placeId, Map<String, Object> param) {
        Map<String, Object> place = findPlace(placeId);
        permission.checkEditor(collectionIdOf(place), userId);
        param.put("placeId", placeId);
        placeMapper.updatePlace(param);
    }

    /* 장소 삭제 (EDITOR 이상) */
    @Transactional
    public void delete(Long userId, Long placeId) {
        Map<String, Object> place = findPlace(placeId);
        permission.checkEditor(collectionIdOf(place), userId);
        placeMapper.deletePlace(placeId);
    }

    /* 사진 업로드 (EDITOR 이상) */
    @Transactional
    public Map<String, Object> addPhoto(Long userId, Long placeId, MultipartFile file) {
        Map<String, Object> place = findPlace(placeId);
        permission.checkEditor(collectionIdOf(place), userId);

        String savedPath = userService.saveFile(file, "place");

        Map<String, Object> param = new HashMap<>();
        param.put("placeId", placeId);
        param.put("filePath", savedPath);
        param.put("originalName", file.getOriginalFilename());
        placeMapper.insertPhoto(param);
        return param;
    }

    /* 사진 삭제 (EDITOR 이상) */
    @Transactional
    public void deletePhoto(Long userId, Long placeId, Long photoId) {
        Map<String, Object> place = findPlace(placeId);
        permission.checkEditor(collectionIdOf(place), userId);
        placeMapper.deletePhoto(photoId);
    }

    private Map<String, Object> findPlace(Long placeId) {
        Map<String, Object> place = placeMapper.selectPlace(placeId);
        if (place == null) {
            throw new ApiException(404, "장소를 찾을 수 없습니다.");
        }
        return place;
    }

    private Long collectionIdOf(Map<String, Object> place) {
        return ((Number) place.get("collection_id")).longValue();
    }
    
}
