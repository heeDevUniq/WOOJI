package com.wooji.service;

import java.io.File;
import java.io.IOException;
import java.sql.Timestamp;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.wooji.common.ApiException;
import com.wooji.common.JwtUtil;
import com.wooji.mapper.UserMapper;

@Service
public class UserService {

    private final UserMapper userMapper;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public UserService(UserMapper userMapper, JwtUtil jwtUtil, BCryptPasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
    }

    /* 회원가입 */
    @Transactional
    public Map<String, Object> signup(Map<String, Object> param) {
        String email = (String) param.get("email");
        String password = (String) param.get("password");
        String nickname = (String) param.get("nickname");

        if (email == null || password == null || nickname == null) {
            throw new ApiException(400, "이메일/비밀번호/닉네임은 필수입니다.");
        }
        if (userMapper.countByEmail(email) > 0) {
            throw new ApiException(409, "이미 사용 중인 이메일입니다.");
        }

        param.put("password", passwordEncoder.encode(password));
        userMapper.insertUser(param);

        Map<String, Object> result = new HashMap<>();
        result.put("userId", param.get("userId"));
        result.put("email", email);
        result.put("nickname", nickname);
        return result;
    }

    /* 이메일 중복 확인 */
    public boolean isEmailAvailable(String email) {
        return userMapper.countByEmail(email) == 0;
    }

    /* 로그인 - Access/Refresh Token 발급 */
    @Transactional
    public Map<String, Object> login(Map<String, Object> param) {
        String email = (String) param.get("email");
        String password = (String) param.get("password");

        Map<String, Object> user = userMapper.selectUserByEmail(email);
        if (user == null || user.get("password") == null
                || !passwordEncoder.matches(password, (String) user.get("password"))) {
            throw new ApiException(401, "이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        return issueTokens(user);
    }

    /* 카카오 로그인 - 없으면 가입, 있으면 로그인 */
    @Transactional
    public Map<String, Object> kakaoLogin(Map<String, Object> kakaoUser) {
        String providerId = (String) kakaoUser.get("providerId");
        String nickname = (String) kakaoUser.get("nickname");
        String email = (String) kakaoUser.get("email");
        String profileImage = (String) kakaoUser.get("profileImage");

        if (providerId == null) {
            throw new ApiException(401, "카카오 사용자 정보를 확인할 수 없습니다.");
        }

        Map<String, Object> user = userMapper.selectUserByProvider("KAKAO", providerId);

        // 같은 이메일로 가입한 계정이 있으면 카카오 계정을 연결
        if (user == null && email != null && !email.isEmpty()) {
            Map<String, Object> byEmail = userMapper.selectUserByEmail(email);
            if (byEmail != null) {
                Map<String, Object> linkParam = new HashMap<>();
                linkParam.put("userId", ((Number) byEmail.get("user_id")).longValue());
                linkParam.put("provider", "KAKAO");
                linkParam.put("providerId", providerId);
                userMapper.updateProvider(linkParam);
                user = userMapper.selectUserByProvider("KAKAO", providerId);
            }
        }

        // 신규 가입
        if (user == null) {
            Map<String, Object> param = new HashMap<>();
            param.put("email", (email != null && !email.isEmpty()) ? email : "kakao_" + providerId + "@wooji.local");
            param.put("nickname", (nickname != null && !nickname.isEmpty()) ? nickname : "우지친구");
            param.put("profileImage", profileImage);
            param.put("provider", "KAKAO");
            param.put("providerId", providerId);
            userMapper.insertSocialUser(param);
            user = userMapper.selectUserByProvider("KAKAO", providerId);
        }

        return issueTokens(user);
    }

    /* Access/Refresh Token 발급 + 로그인 응답 구성 */
    private Map<String, Object> issueTokens(Map<String, Object> user) {
        Long userId = ((Number) user.get("user_id")).longValue();
        String email = (String) user.get("email");

        String accessToken = jwtUtil.createAccessToken(userId, email);
        String refreshToken = jwtUtil.createRefreshToken(userId, email);

        Map<String, Object> tokenParam = new HashMap<>();
        tokenParam.put("userId", userId);
        tokenParam.put("token", refreshToken);
        tokenParam.put("expiresAt", new Timestamp(System.currentTimeMillis() + jwtUtil.getRefreshValidityMs()));
        userMapper.insertRefreshToken(tokenParam);

        Map<String, Object> result = new HashMap<>();
        result.put("accessToken", accessToken);
        result.put("refreshToken", refreshToken);
        result.put("userId", userId);
        result.put("email", email);
        result.put("nickname", user.get("nickname"));
        result.put("profileImage", user.get("profile_image"));
        return result;
    }

    /* 로그아웃 - Refresh Token 폐기 */
    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken != null) {
            userMapper.deleteRefreshToken(refreshToken);
        }
    }

    /* Access Token 재발급 */
    @Transactional
    public Map<String, Object> refresh(Map<String, Object> param) {
        String refreshToken = (String) param.get("refreshToken");
        if (refreshToken == null) {
            throw new ApiException(400, "refreshToken이 필요합니다.");
        }

        Map<String, Object> saved = userMapper.selectRefreshToken(refreshToken);
        if (saved == null) {
            throw new ApiException(401, "유효하지 않은 Refresh Token입니다.");
        }

        // 토큰 자체 검증 (만료 포함)
        Long userId = jwtUtil.getUserId(refreshToken);
        Map<String, Object> user = userMapper.selectUserById(userId);
        if (user == null) {
            throw new ApiException(401, "존재하지 않는 사용자입니다.");
        }

        Map<String, Object> result = new HashMap<>();
        result.put("accessToken", jwtUtil.createAccessToken(userId, (String) user.get("email")));
        return result;
    }

    /* 내 정보 */
    public Map<String, Object> getMe(Long userId) {
        Map<String, Object> user = userMapper.selectUserById(userId);
        if (user == null) {
            throw new ApiException(404, "사용자를 찾을 수 없습니다.");
        }
        return user;
    }

    /* 비밀번호 변경 */
    @Transactional
    public void changePassword(Long userId, Map<String, Object> param) {
        String currentPassword = (String) param.get("currentPassword");
        String newPassword = (String) param.get("newPassword");

        Map<String, Object> me = userMapper.selectUserById(userId);
        Map<String, Object> user = userMapper.selectUserByEmail((String) me.get("email"));
        if (user.get("password") == null) {
            throw new ApiException(400, "카카오로 가입한 계정은 비밀번호를 사용하지 않습니다.");
        }
        if (!passwordEncoder.matches(currentPassword, (String) user.get("password"))) {
            throw new ApiException(400, "현재 비밀번호가 일치하지 않습니다.");
        }

        Map<String, Object> updateParam = new HashMap<>();
        updateParam.put("userId", userId);
        updateParam.put("password", passwordEncoder.encode(newPassword));
        userMapper.updatePassword(updateParam);
    }

    /* 프로필(닉네임) 수정 */
    @Transactional
    public void updateProfile(Long userId, Map<String, Object> param) {
        param.put("userId", userId);
        userMapper.updateProfile(param);
    }

    /* 프로필 이미지 변경 */
    @Transactional
    public Map<String, Object> updateProfileImage(Long userId, MultipartFile file) {
        String savedPath = saveFile(file, "profile");

        Map<String, Object> param = new HashMap<>();
        param.put("userId", userId);
        param.put("profileImage", savedPath);
        userMapper.updateProfileImage(param);

        Map<String, Object> result = new HashMap<>();
        result.put("profileImage", savedPath);
        return result;
    }

    /* 회원 탈퇴 (soft delete + refresh token 폐기) */
    @Transactional
    public void withdraw(Long userId) {
        userMapper.deleteRefreshTokenByUser(userId);
        userMapper.deleteUser(userId);
    }

    /* 파일 저장 후 웹 경로 반환 */
    public String saveFile(MultipartFile file, String subDir) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(400, "파일이 없습니다.");
        }
        try {
            File dir = new File(uploadDir, subDir);
            if (!dir.exists()) {
                dir.mkdirs();
            }
            String original = file.getOriginalFilename();
            String ext = (original != null && original.contains("."))
                    ? original.substring(original.lastIndexOf('.')) : "";
            String fileName = UUID.randomUUID() + ext;
            file.transferTo(new File(dir, fileName));
            return "/upload/" + subDir + "/" + fileName;
        } catch (IOException e) {
            throw new ApiException(500, "파일 저장에 실패했습니다.");
        }
    }
    
}
