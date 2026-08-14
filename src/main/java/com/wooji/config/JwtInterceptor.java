package com.wooji.config;

import java.util.regex.Pattern;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.wooji.common.ApiException;
import com.wooji.common.JwtUtil;

import io.jsonwebtoken.Claims;

/**
 * /api/** 요청의 Authorization: Bearer {accessToken} 검증
 * 통과 시 request attribute 에 userId / email 저장
 *
 * 단, PUBLIC_GET 에 해당하는 GET 요청은 토큰 없이도 허용(익명 조회)
 * 이 경우 userId 는 null 이며, 공개 여부 검사는 서비스 계층(PermissionChecker)이 수행
 */
@Component
public class JwtInterceptor implements HandlerInterceptor {

    /** 비로그인 조회를 허용하는 GET 경로 (공개 컬렉션 열람용) */
    private static final Pattern PUBLIC_GET = Pattern.compile(
            "^/api/collections/public$"
          + "|^/api/collections/\\d+$"
          + "|^/api/collections/\\d+/places(/nearby)?$"
          + "|^/api/collections/\\d+/comments$"
          + "|^/api/places/\\d+$"
          + "|^/api/search/places$"
    );

    private final JwtUtil jwtUtil;

    public JwtInterceptor(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            if ("GET".equalsIgnoreCase(request.getMethod())
                    && PUBLIC_GET.matcher(request.getRequestURI()).matches()) {
                return true;    // 익명 조회 허용 (userId = null)
            }
            throw new ApiException(401, "로그인이 필요합니다.");
        }

        Claims claims = jwtUtil.parse(header.substring(7));
        if (!"ACCESS".equals(claims.get("type", String.class))) {
            throw new ApiException(401, "Access Token이 아닙니다.");
        }

        request.setAttribute("userId", Long.valueOf(claims.getSubject()));
        request.setAttribute("email", claims.get("email", String.class));
        return true;
    }
}
