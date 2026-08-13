package com.wooji.mapper;

import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserMapper {

    int insertUser(Map<String, Object> param);

    Map<String, Object> selectUserByEmail(@Param("email") String email);

    Map<String, Object> selectUserById(@Param("userId") Long userId);

    int countByEmail(@Param("email") String email);

    int updatePassword(Map<String, Object> param);

    int updateProfile(Map<String, Object> param);

    int updateProfileImage(Map<String, Object> param);

    int deleteUser(@Param("userId") Long userId);   // soft delete

    // Refresh Token
    int insertRefreshToken(Map<String, Object> param);

    Map<String, Object> selectRefreshToken(@Param("token") String token);

    int deleteRefreshToken(@Param("token") String token);

    int deleteRefreshTokenByUser(@Param("userId") Long userId);
    
}
