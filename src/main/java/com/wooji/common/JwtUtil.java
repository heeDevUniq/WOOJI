package com.wooji.common;

import java.util.Date;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-validity-ms}")
    private long accessValidityMs;

    @Value("${jwt.refresh-validity-ms}")
    private long refreshValidityMs;

    public String createAccessToken(Long userId, String email) {
        return createToken(userId, email, "ACCESS", accessValidityMs);
    }

    public String createRefreshToken(Long userId, String email) {
        return createToken(userId, email, "REFRESH", refreshValidityMs);
    }

    private String createToken(Long userId, String email, String type, long validityMs) {
        Date now = new Date();
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("email", email)
                .claim("type", type)
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + validityMs))
                .signWith(SignatureAlgorithm.HS256, secret)
                .compact();
    }

    /** 토큰 검증 및 파싱. 유효하지 않으면 ApiException(401) */
    public Claims parse(String token) {
        try {
            return Jwts.parser().setSigningKey(secret).parseClaimsJws(token).getBody();
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            throw new ApiException(401, "토큰이 만료되었습니다.");
        } catch (Exception e) {
            throw new ApiException(401, "유효하지 않은 토큰입니다.");
        }
    }

    public Long getUserId(String token) {
        return Long.valueOf(parse(token).getSubject());
    }

    public long getRefreshValidityMs() {
        return refreshValidityMs;
    }
}
