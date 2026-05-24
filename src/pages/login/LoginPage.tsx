import * as S from "./LoginPage.styled";
import MainBtn from "@components/button/MainBtn";
import { useState, useEffect } from "react";
import LoginInput from "./components/LoginInput";
import { useNavigate } from "react-router-dom";
import { useLogin } from "@hooks/useLogin";
import { ROUTE_CONSTANTS } from "@constants/RouteConstants";

const LoginPage = () => {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const navigate = useNavigate();
  const { login, loading, errorStatus, data } = useLogin();

  // 로그인 버튼 클릭 시 API 호출
  const handleLogin = async () => {
    await login({ username: id, password: pw });
  };

  // 400 에러일 때만 인증 실패로 처리
  useEffect(() => {
    setPwError(errorStatus === 400);
  }, [errorStatus]);

  // 로그인 성공 시 이동
  useEffect(() => {
    if (data) {
      navigate(ROUTE_CONSTANTS.SERVING);
    }
  }, [data, navigate]);

  // 인풋 변경 시 에러 초기화
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setId(e.target.value);
    if (pwError) setPwError(false);
  };
  const handlePwChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPw(e.target.value);
    if (pwError) setPwError(false);
  };

  // 인풋 포커스 시 에러 해제
  const handleIdFocus = () => {
    if (pwError) setPwError(false);
  };
  const handlePwFocus = () => {
    if (pwError) setPwError(false);
  };

  const isActive = id.length > 0 && pw.length > 0;

  return (
    <S.Wrapper>
      <S.Contents>
        <S.HeaderSection>
          <S.Title>
            서빙을 더 쉽고,
            <br />
            빠르게
          </S.Title>
          <S.Logo />
        </S.HeaderSection>
        <S.FormSection>
          <LoginInput
            label="아이디"
            type="text"
            value={id}
            placeholder="아이디를 입력해주세요."
            onChange={handleIdChange}
            onFocus={handleIdFocus}
          />
          <LoginInput
            label="비밀번호"
            type="password"
            value={pw}
            placeholder="비밀번호를 입력해주세요."
            error={pwError}
            onChange={handlePwChange}
            onFocus={handlePwFocus}
          />
          {pwError && (
            <S.ErrorMessage>
              아이디 혹은 비밀번호가 일치하지 않아요.
            </S.ErrorMessage>
          )}
          <S.BtnMargin>
            <MainBtn
              text={loading ? "로딩중..." : "서빙 시작하기"}
              onClick={handleLogin}
              disabled={!isActive || loading}
            />
          </S.BtnMargin>
        </S.FormSection>
      </S.Contents>
    </S.Wrapper>
  );
};

export default LoginPage;
