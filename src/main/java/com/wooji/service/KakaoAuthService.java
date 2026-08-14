package com.wooji.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import com.wooji.common.ApiException;

/**
 * 카카오 로그인 연동.
 * 인가코드 -> 액세스 토큰 -> 사용자 정보 조회
 */
@Service
public class KakaoAuthService {

    private static final Logger log = LoggerFactory.getLogger(KakaoAuthService.class);

    private static final String TOKEN_URL = "https://kauth.kakao.com/oauth/token";
    private static final String USER_URL = "https://kapi.kakao.com/v2/user/me";

    @Value("${kakao.login.rest-api-key:}")
    private String restApiKey;

    @Value("${kakao.login.client-secret:}")
    private String clientSecret;

    @Value("${kakao.login.redirect-uri:}")
    private String redirectUri;

    private final RestTemplate rest = new RestTemplate();

    public String getRestApiKey() {
        return restApiKey;
    }

    public String getRedirectUri() {
        return redirectUri;
    }

    public boolean isEnabled() {
        return restApiKey != null && !restApiKey.trim().isEmpty();
    }

    /* 인가코드로 카카오 사용자 정보 조회 (providerId / nickname / profileImage / email) */
    @SuppressWarnings({"unchecked", "rawtypes"})
    public Map<String, Object> getKakaoUser(String code) {
        if (!isEnabled()) {
            throw new ApiException(500, "카카오 로그인이 설정되지 않았습니다.");
        }

        // 1) 인가코드 -> 액세스 토큰
        String accessToken;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("grant_type", "authorization_code");
            form.add("client_id", restApiKey.trim());
            form.add("redirect_uri", redirectUri.trim());
            form.add("code", code);
            if (clientSecret != null && !clientSecret.trim().isEmpty()) {
                form.add("client_secret", clientSecret.trim());
            }

            ResponseEntity<Map> res = rest.exchange(TOKEN_URL, HttpMethod.POST, new HttpEntity<>(form, headers), Map.class);
            accessToken = (String) res.getBody().get("access_token");
        } catch (HttpStatusCodeException e) {
            String body = e.getResponseBodyAsString();
            log.error("카카오 토큰 발급 실패 - status={}, redirectUri={}, secret사용={}, 응답={}", e.getRawStatusCode(), redirectUri, (clientSecret != null && !clientSecret.trim().isEmpty()), body);
            String detail = (body == null || body.isEmpty()) ? "HTTP " + e.getRawStatusCode() + " - Client Secret 설정을 확인해주세요." : body;
            throw new ApiException(401, "카카오 인증에 실패했습니다. " + detail);
        } catch (Exception e) {
            log.error("카카오 토큰 발급 중 오류", e);
            throw new ApiException(401, "카카오 인증에 실패했습니다. 다시 시도해주세요.");
        }

        // 2) 액세스 토큰 -> 사용자 정보
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + accessToken);

            ResponseEntity<Map> res = rest.exchange(USER_URL, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            Map<String, Object> body = res.getBody();

            Map<String, Object> account = (Map<String, Object>) body.get("kakao_account");
            Map<String, Object> profile = account == null ? null : (Map<String, Object>) account.get("profile");

            Map<String, Object> result = new HashMap<>();
            result.put("providerId", String.valueOf(body.get("id")));
            result.put("nickname", profile == null ? null : profile.get("nickname"));
            result.put("profileImage", profile == null ? null : profile.get("profile_image_url"));
            result.put("email", account == null ? null : account.get("email"));
            log.debug("카카오 사용자 조회 성공 - id={}, nickname={}", result.get("providerId"), result.get("nickname"));
            return result;
        } catch (HttpStatusCodeException e) {
            log.error("카카오 사용자 조회 실패 - 응답={}", e.getResponseBodyAsString());
            throw new ApiException(401, "카카오 사용자 정보를 가져오지 못했습니다. (" + e.getResponseBodyAsString() + ")");
        } catch (Exception e) {
            log.error("카카오 사용자 조회 중 오류", e);
            throw new ApiException(401, "카카오 사용자 정보를 가져오지 못했습니다.");
        }
    }

}
