import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { C, display } from "./jourzy-theme";
import { TripRow, tripTile } from "./trip-row";
import { useSavedTrips } from "../../utils/useSavedTrips";
import { useDestinationPhoto } from "../../utils/destinationPhoto";
import { apiFetch } from "../../utils/api";
import { supabase } from "../../utils/supabaseClient";
import { useTranslation } from "../../utils/translations";

const API_BASE = import.meta.env.VITE_API_URL || "";

// Purely decorative inspiration content — no backend record behind it (same
// as the reference mockup's own hardcoded destinations array). Tapping one
// just seeds the planning chat's input with a starter message.
//
// photoRef is a real Google Places photo reference (one-time lookup — see
// scripts/ if these ever need refreshing), served through the existing
// /api/photo proxy backend/server.js already uses for hotel/activity photos
// — same mechanism, same GOOGLE_MAPS_KEY, nothing new on the server. If a
// reference ever goes stale, <img onError> below falls back to the
// gradient+emoji tile rather than showing a broken image.
//
// tag drives the taste-based ordering below — 3 destinations per vibe so a
// traveler whose past trips lean toward one vibe still sees real variety,
// not the same place every time.
const DESTINATIONS = [
  { name: "Kyoto", emoji: "🍁", tag: "culture", photoRef: "AWCwydiORJ2d3TP0aP5kc7YcLtldgF-ioR2ZEyr75dfoxFQSvIDXHW0nxh4L_nZCZJA0SSoOspsVUwrqRZzfVE254w8oL-ti2JbTvSZHPVp7iIQwvcBImH7i2f3QWHFv27ch1We-Cwd1-_sND8SR1ZhUGrM35YCiw6mP9Sc0LuhGlMkCe2IQtx5m4RasGrdQ8FTxP3uST5GxIQ3iVkZSLiAlAnxBLKYhYj24bsVZP2SOu_ngv2wzIDNqW0KbWMAm2nlxhC9M4y_1y2CLytf8FMK5twYgaP2yHMM0Q4HzWcskSqx6qqSTBAMsKbDSrUatay-4Yg-VFw4-q9E5E6yjXHHMWpc9M5A1GxopF_VXKEOB5D-vrSqzM7A9LoE04_B0mHbWBdz2fH0p0yzcrM_R8Y08smt7pKPnWdmbUn88ltda89VDHA" },
  { name: "Hội An", emoji: "🏮", tag: "culture", photoRef: "AWCwydgxX30zBrzyHumiJJFHF9QwQePXM0Fzq3K97WC0VarIB31RRnJhveth8XLVsZVWuGUVpf-ylvKnMc01nkd5fkBVRhp2zS-r7X9f3HWSFHuuNxK0MDYcX_B8OaavSxDdpFkfZu4EARY0aVgoADpTEXFMardp2k66puDoWjI-Pw6vJluAZmaFnw56LuW7-HCmt16yP2EArn_1byktZBxeFpXvhHE_zHHsIrVe4hdbBea-7GWzyQXHIxQSVcPJCrk8vn8nCpDZ8mnpZ8lhsaHGEzWJ1wFZYiOf9JriZTyDuSmWKEB2tmVvzFtIZxhoTluoft_hOAn_wTJ3UBk383LDaYf6Z9a7uc9pc8SWZxagBiE5R-0ORnca81tTwEf55SuT1TrA6RIUPcKr75YfVTD8okbs6ujv3zHyv6900DWXF9mgrh5k6GmouugWj-WWBhna" },
  { name: "Rome", emoji: "🏛️", tag: "culture", photoRef: "AWCwydj0GpMulCAQf-YRAmNlaD1ZK3XARgkkeWl9qnkRFyzvky-brEy2y3EZWnXPI-lZt3vx4zePgTkHCg_wDOvjlTWzsxUkxRhuZaow03E6C5hEAL9_7h8jOD8RsNGn3taDfSfZ1iMi_paU81cSLtKlskoNd9eKVU4QyGC6mspKx09_5oOPf1LgO1XOe609XVQ9gFK0vtssuPLKySN9m5oS7_J7iZhD-_docFwg6rQVIkFBxnmSwmTl4HW3ve-rKOPFUQkst6EJuxTyvBUdeLWeFkzGHfyqYlRjt48gfplBuQKSDtLcK9MYwGhxOcF3uxrPqYrPV2ZkqqP9ag5ZqQ4YeUaQ2tTqGgjpGTjdDGM84UPhsqwyLqJYdeeIaXDXYMRfTpcxg3MPez-snmKL_aQd_Z03saXDQd3vrIojSY6sS_e0zg" },
  { name: "Bangkok", emoji: "🍜", tag: "food", photoRef: "AWCwydgrI5tgQ97RJj3tYRShE6hK-GHOQT9iFLVGg-Z-VcW39b_lxtQT5sGY5TKSJl0kWCt7qWUFdyXdNdgjsb64bu42XbPSOPxxXhL8ObCjEMRE0w-ERBs_06q2jgvRzALNsPVHikmnD7QgGSwabLKdRyLv5LPjtGcKBZ775GD8LB8V86t3GFdjLm06S4lgWX8gAszTA_5wSwOH54s1Nk7J0c8axO8fE9cSxjXMM2MwkdZzz1cs9RBF1nit2xxd1MnMJ6W76Sgae9hg0bmNkvQQcdwQvjHZ8q2AZE3n3Bfr7vMIa8rUlub42YtK7FKDF07ljM9ausHoIaZap3zbENpaKZjzKNe03mW-ADg4phQXJLQkL2dWDaTmyHMyAUgykullP2xAnOJ_47ziIEkUMtbGIvWNKkZOcByIc_kedFwWLmSUdWgD" },
  { name: "Osaka", emoji: "🍢", tag: "food", photoRef: "AWCwydgVqeWN9BEMIS3vXqrFaAzj4yRm0zP_NmDI4IlachboSfZxll-pWPVIQOiiACaMP9RI9raJFXEVLMmreYfFJiW_pFOwp4K72TXbff2YlYRne-Wv-WjVaERindPvuzh83ZGGsFU_4buLBDze6bgA2rcDAqrtueQpv3Kku5W7N1tITrfbInynQbM50cvhrU4NdzSqnvJerFXkoe8yWcnf5X0A8BgFlyYaoE649Tfi1vRUvr26wG1nOeoQDb51p_YfSfKdDNp9XFz1sbeI6aWK5U5DLIYyP_5ZfC_ljINF6hZsB877j0bkPqahVpA6ZEKKJb82zltVTNP3HiE7Zdn_VRhL2It8gWXNmyXXrwWRvnLLxTb3SxtBWWbDYLvgKhhMo_HhKu32EAiWT4bU1HzYO9QKoPo8kEdygNIZelZ0yl3E3w" },
  { name: "Mexico City", emoji: "🌮", tag: "food", photoRef: "AWCwydgm3ZBtyKgSZlHBjYCuSIHVsAwvoKHkudxfGcZiULwQcfQkspXlobo9c2Ge4xy1IOPhsSJduUhSzbdh2AabQDTYhFKUg8vj8ksTLXPpbUv9v2mU0vzAyeyXMhBin--mftPo2E1Iu3DptbZY_nXV2AJeaTFudW2cvERazjBraqBkzvVxSVVqkAhYR6X7XYmpwnbs0-OnZXnthDCx91-Piu-1h3uQDVbG1wiev8UqtusP-tnt9wgXiNehldPy5YIrPhITXYp9Bfe0yMyWWTsyonKtrsVXkXQFaOS4VPrgS3p4ryeCxp7ZdJAC-zG63kAsKrNQyuPriE8tb9zH0Bwf9-zyuCcgqe-AflZ7NrF4IBsRi2jcrrl8QFcOawL5f-IVqG212cBTV8Qyg1_IW-Wzbw53YqCJW2Ip2xUiAm6lr5UlMR9t_bKnT0aa8Ts8-Kam" },
  { name: "Reykjavík", emoji: "🌋", tag: "nature", photoRef: "AWCwydib7Mm1GamcGFrMvjOzQaOGCGjFAeq0fQ1PRSFhu9KkrcHVZI6OY6g6C4gLFIHj7VCf3xdAVviRGc1zsmZZB8pz-z_4txU0WAMcSLCulkPhqGuu7DFgTN8msThKCJq1Y_uUpuQ8jRrrUEPwfiL9Vk5kY37tNC3Jzm9yO4AEqeOmKW5C87AsDyDP_PsV5GhEfCKrEB_SpjxngKDMdqJX9MMKsFz-1g0ujAMImPx-nAkkFSPeX0TqznAJObo6r7PQgd42IANIU6BxDaNiEFDNCXER7YXe3kf9IssO1PsxlAQfG0c5CpgOGBI9Md3b8oeHBBasrV0IbtIs0D8DTFG7tYH8Ic6mWNe2ZO6Dn_LnbqLPqrO1tDkjdICZONOJLq5WJILOGbwos6eGLXwu9vraCkPrnCHmVUdEPhR5rsrsgwOcnXA" },
  { name: "Banff", emoji: "🏔️", tag: "nature", photoRef: "AWCwydgUJJI5XLVPSPUp_xayU4l8lblg4rRqVagwvcFRyVQ99SprxtRr_eQ-R5QaB1_xnqmuoLxIIcsq5XWWwLdusytNqj_wUTF9waJ2mxVVbqUW_XNfEipvyZ7ioofaz-UbNLss6V-nRN1Zm7YCsiMNoorz4SsxRlzExGsEBjHEvMN_eaTLwR9l4O78AO1GC6QrEeDZWkL_PyQCIqqltrk9S5YJWhUWvHLCfSnXIVIiim4h-V2uPwn74P-ginHBVnhv3aUaMsgLz70JoYE0NKvc570WdLnUWZtD1ITuIdGXhVcIFYz2RhkPq48CJ2fxSoVmG08Oq5NUIxPExO8ElcDwX-vrJb2nuEhKt_VRv-d-RbRgMMATtWxvr1_bCaupM12CfPOByjO9wySTCbYtNpxg_T06Hc5-hdqZZGrujuLK6fv_aJGb" },
  { name: "Queenstown", emoji: "🚣", tag: "nature", photoRef: "AWCwydi8zJPxhxwFutKa_Nx1ywNXL2hfU2kfyPzMcdf4_EyQxGvV8rd0_Z42Vi6kF51qffE2icRvdW6XJbj_6mCG0U-B6naOhOuKWKKk2lrueIlVNWCuVYTWsBzyPYQcFJPVXI9ElHtA1kDzaw11whhThe_HHPQmvFIJvBb0zYDDTkWt3Mv-jNvUwYfK7IAqGwDBNj0bkE8wP4HoWWDrRSZv9PWq7-OMSkkL1gbbWPR1W1ht6Li79D30QlKAXTSQMgX5H2sHLzwbHPHr4E3Bry6Jq8x3ZydCVX5hngJ3zDTCTcZVf-ZaCvgSazGyImJCEKj0s3uscr148rSPwAgLWFij760Nc4ottpmTeHjAYDapXx-qvrjZ10xa5OBJFRHYUkcpU6DzZLRAFZIMYDu8qRida3RGZVo-xwoOfFV2YPLpPPQ5tw" },
  { name: "Marrakech", emoji: "🕌", tag: "adventure", photoRef: "AWCwydjMQQQstDngzCv9__coYH6ZQ4qjWzENefRZeld3WpvwHmIKrElaFwmPjCDihpkbZyYtQIZfnSHPx1cTBwG2By-L5JP8UFCtIhROXxEbYDzoXo5bHxUBtSZ4zWA1kwkg_17hvq5puqmiulM6KeE0RzuEw36EGMTpvbNEQvtorWgoVt0v9vH_jM4u2RvZCMVjRcvVxdRnI7n_9MYY8Jbzj4Jk49RiTWxWZdWEz1abPY4OPecVgwIqkf3EVIKCZWvaKBw5cB38PJjf99gPZcHbGiTiTK09zkOyTY5vXiA01o5lUqqzXEz8PfvhgB-RJackODjMh1tQgJPELaKvKni8f47NES6SdOeMzvH7ZUmFk1K7pj0oh0FAih6X8udd8rVg9iJ7-GEdrfXcuNnu4ckrBeztqwAb9TmHPiaUZCXK9N2Sjw" },
  { name: "Cape Town", emoji: "⛰️", tag: "adventure", photoRef: "AWCwydhGiW1aOVG8EouXt8PdNJYcZftuaseBsttJ475wtUKe56_q-bBfp5l8ej_1ci-krTDTFdN8JT-wBfrHNavWzMfTVbtKdTBCRPr0NhLXcz0sJObWAcZg3ggjXE4Jxn25ParMcvzQk1fDY4DEWVXhedpj2e-K78R2CfTojjzBTXAWSwhiu_ESzobfVGXEVPxR7UG9_s5VDSEAqaDz1da0sc88d6XNzSB72R3SzXDlzhc9iF-7qdMFLqP5RY-Yzcaq5YHlTMGmaVFedlIOlFk4LtT9Y2IVwHW_hjP9ycU-MfrFxdPHDMRg01VxnBAd-ExouNNGexE9MbuvfzHC-yePGDZmCRvP9JSUbCnfywq9zh1ENRuWWIS-6dv66h0C2zxCLWpiytqMBUgUr-vxSLie13bqxf_BnDSBNl64sMZ3Vg7tBw" },
  { name: "Kathmandu", emoji: "🏔️", tag: "adventure", photoRef: "AWCwydj1IVnUI6AByAkhroEO5HgzvY_cJadx5H8E6WPPQEMrj8T6ywIc-C9TqTqt_AY-_cLXWc5KwMZjrXSzPKkaSWq3ClLBYBaJ6we96lL1N0Pf4Ne5HJs4Xpnsi-zQe8XG0r_cOmFjp38fRtsbZbCEeEgkOG7G_M5a7ej51t5krhd9yPMvyBPoxDeo3JX3c_WCQ0gXDL24l9ZOx1yVh7soIs9oR0F1Fja-XPr_WajzPjf003j_sFOkWBSJ_vL4xssE82f5bRz4s7fHr4xuY41tYeM5XBwkGP9SvdFv1JyiZYg_-AgGMii03u3pHb0-A35c6okgUpwPQL7__mBQZ4n_pz2FcZcz_EP4fdPOWjMtZ_hd2Y0JewABIAahuyYrpRGIGQc5k2iqZNOzZbXvnVcwYlMxKMR4KbJ0lp2FBxDVOfJvNUDTxZoDX15WfMrvQYVr" },
  { name: "Bali", emoji: "🌴", tag: "beach", photoRef: "AWCwydgqH26iRMEQcYBvjoESAdKgCGiMatySjUf5UazajXHTf791qJER7EI9WmP4mY9QHp9ZpjWMRKVcrLI3BtzPWzA7ZXuclYtYYMAb1WbgcOEljYTnP8lF2xPDTFPn6GYaCn9iHOvgKpM2Kq9kM6J_W095TrODdHWpGM3vrz520Sa5LHotvghe4NA_2Gz5YGvMbrYuu-Jca8V6meKiq7QJI2eQwIEjvH5sfl55D3a5eKvOcxd2Ec1oOs6yT1q6wr-WSjYFW8f46OiWHp84iNyI8oaYbMZdEXEhGZubGFTjgdGosl0MEpSAruO4rzMlV1_feA8CTWvks8dIqAgkRuzeiSV3qzmwZ_wwFWpGljGMZDDd_YkmXbkl4Tp16xImOa64YMGPouuje4kHtu0Bn3Q1Y5E69I0X4g_nh60EXX1nVCeBk0Ii" },
  { name: "Santorini", emoji: "🏖️", tag: "beach", photoRef: "AWCwydg7-jEzHd8TBQZXyOAQr66-n8xO_suibfBdBt7REz129qKz1OFai-x6ZIPoT67tbXUqWHLifh1QPufqCozlXB87iiJZZzbGc9-wUkfXr7GXWCoCudDoycnUSG-3iNouDdikBp1buLSCWpQYfyIrgH12NN9sixGsDqyDXiYaod5abd-EWAFTzksoMM9OnVmDfHftVI-ROux4OgzIj0vvOUQ8ZpCwrs5CN1Qbe52xXKKc0JhuFaQS-IhmNuI6vkhjJY-SwHSCL-o_63eBsrIFRZx8IH1cBD_V7VC2ktej0hGNti_As9YinhfjkqYJTRAzhQaxSTwsCeaQOUcvOdEMcIqs_DMIw7pgeubGNcrotttTWEsPhCf2XlLLpuJT6NzuxmQtsaXdJW13B1lGZM-FgqiGTwSVyJNaObpg02HC9LUCiyQ" },
  { name: "Maldives", emoji: "🏝️", tag: "beach", photoRef: "AWCwydh8r7atbGj-tfYLwEIIL0dblyfQnIAhDp3UnzGZNy9gjSHxoXcXE1dJDuB-nxVzu3FTds3m3aNiTyUAzrNtOUbKNJDRkuYKW9g8MMJnRfazuhb4JhZbr7t_s4RZ1DtBDRG00_REOcBK9dYjAvwpGN3rzdHee7dyBQMFBvllj-SigvZ9yp1DuhyzCmENZ5v95DMoDSTL1Tx9ZS8aaHyuvd4YZST56aFhZKkmZ1497h4C5C7-LH4ainHXSRL8aOFvRMnhGB0nN8iUNjL5I3UeeV0tcJguBkPGWzhoNUlpY9rr0vlePSTkwY91bx5OdAry2vZd4FvpL_JCbBA7qANjhbZ2BZ5Nw4kc3td4n0ErcinJxyhqjmu1boi7LCNUMRpCzaKI_6jzFnAha_4svyjsst0qUgKlK2Z7FVPtvgdcO410CA" },
  { name: "Lisbon", emoji: "🚋", tag: "city", photoRef: "AWCwydiMHIU16Ot9kUgsukRIOg-ot0HGsjHeTKULuN_JMko4c6lWJK-7yekNiHpHfxbL9FFxO_-mm5_447lS7DQRKiuaXyxnLDMPLzpaHFvsna1acL3XkWKoqnNgkCpguyyQ1vXlIUdWEBSoLfeq81JZvlz37yK_yerLtTSfm033pKXKrO61xuCjrWONH1LESyoxE4ms-qlBoP-9MwePQqlAvqZtc8WxGRk5XQzJ23p-6I0SJb_v8p8bBzHdm_1AhxOH4F9RhJvYipwxSnPhstocbYhyPA8XJoeRh1_7L9ix4Auy320Hn-IzVhnSzx36uOU0W2RZA6wjFSCYvqM0m1Qfn5fTCuejgg2rpa14NNYNo8K3_G-pY4rIjgGc232dN2KHswKtoHwiEMlVI9_G7RbF5dqOJph2zs2cAJfE6e-WXgXKPQ" },
  { name: "Singapore", emoji: "🌆", tag: "city", photoRef: "AWCwydjkilHY0OsgfUkFMFbebC4gTyUpD_DDZtxE59scHYPButXjHWGDF7AxdRnMwWLv-A4ztK1b_RhNLxgcOHsS0x_cE6W5rYYMXoPw7tR0j0fK-7o-GVTioOEdfeOGOAeiM7HYs4sHWP9DLVIMifd58bTCKsfKuTytDg7k_Rz_rExPQ9mXbfE-jOae6iUQxqhi3U2glTJRDNUoy6O33ta4XWcm2c0XU5YnLRDGUHUDMK5pzP79s5AtCD308RQjhaG8yVF-hxBXSNpaIUPCwaJ1IkZqqKrc256DCJxvsah6H3cLzg4YILVf7xCi8RgBvOcehhT2kkw9qj1BHL9RIHxI1qzs3X70CXRZEGnnFXQeNecVNv2EqptCcQJwLgjDSUBiLQzVTB_dtVtyI7cG7phBvTlFR_rZPjRjqf_96l4sBgPV-FdFPEkSkf4Y2-BSfA" },
  { name: "Barcelona", emoji: "🎨", tag: "city", photoRef: "AWCwydhScXDQszZ5q9ieCzaf_Jo-7NnJ5pt-x9WCVeVcO4DHWGTnwZk-pob5o2ZnAV0kpznSMACjh2fUinCph16fBU-p3kUjOWDkG8PgZ5_0xAhtEKu6YUDIx3QNNY9kzhWjfvL1xUg2Z5So9j37Rj8aaqyuxOh8JSnAWPFVTUcwyOva3qK1m_w2UpVMCE42dpld6OVzsZmpF9k78DH1Swhtd1pbYIqYpF1gU_8YPHJesrasVv1I__clkqiOd47YMeyEvNjYOpWxUW7u8N54l0ToxPIhx1HyIUjuDe0sgP79BdZSet6Wp9dQ8tobH2QEPg9YrM2aVwNwqjPpzz5dwbKwu32i0yH0tckPNhqSaRwYTWkdcSzxeZLfEgg0H5DZNG4zYRQVhV9ekf8ld6qL4fMnNR9PjrEZ1jRZr1Pwg72NxQQXuAkIDYcBAvvgUHWuX0Xa" },
];

// Maps the same real activity-category vocabulary CAT_ICON (plan-view.tsx)
// already uses onto the destination pool's six vibe tags — no separate
// taxonomy to keep in sync.
const CATEGORY_TO_TAG: Record<string, string> = {
  food: "food", culture: "culture", museum: "culture", exhibition: "culture",
  nature: "nature", activity: "adventure", shopping: "city", rest: "beach",
};

// Real signal, not fabricated "trending" data: tallies the categories of
// activities across the traveler's own saved trips (already fetched via
// useSavedTrips, itineraries included) and ranks vibe tags by how often each
// shows up. A traveler with no trips yet (or nothing that maps to a tag)
// gets the pool in its original default order — no personalization to base
// it on.
function tasteTagOrder(savedTrips: any[]): string[] {
  const counts: Record<string, number> = {};
  for (const trip of savedTrips) {
    const days = trip.itineraries?.[0]?.days || [];
    for (const day of days) {
      for (const activity of day.activities || []) {
        const tag = CATEGORY_TO_TAG[activity.category];
        if (tag) counts[tag] = (counts[tag] || 0) + 1;
      }
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
}
const VIBES = [
  { label: "Beach", emoji: "🏖️" },
  { label: "Culture", emoji: "🏛️" },
  { label: "Food", emoji: "🍜" },
  { label: "Adventure", emoji: "⛰️" },
  { label: "City break", emoji: "🏙️" },
];

export default function HomeView({
  openTrip: onOpened, onStartPlanning, onSeedPlanning, onSeeAllTrips,
}: {
  openTrip: (tripId: string) => void;
  onStartPlanning: () => void;
  onSeedPlanning: (seed: string) => void;
  onSeeAllTrips: () => void;
}) {
  const { t } = useTranslation();
  const { savedTrips, upcomingTrips, historyTrips, loadingTripId, deletingTripId, fetchError, loading, fetchTrips, deleteTrip, openTrip, isBroken } = useSavedTrips(onOpened);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const resp = await apiFetch('/api/memory');
        if (resp.ok) {
          const data = await resp.json();
          const name = data?.memory?.preferences?.userName;
          if (name) setUserName(name);
        }
      } catch (e) { console.error('Failed to load profile name:', e); }
    })();
  }, []);

  // Only "new user" once we actually know that — otherwise a returning
  // traveler with real trips flashes the empty-state hero for a moment on
  // every cold load, before the cached/fetched trips have set in.
  const isNewUser = !loading && savedTrips.length === 0;
  const upcoming = upcomingTrips[0];
  const heroPhotoRef = useDestinationPhoto(upcoming?.region || "");
  const previewTrips = [...upcomingTrips, ...historyTrips].slice(0, 4);
  const hasMore = upcomingTrips.length + historyTrips.length > previewTrips.length;

  const tasteOrder = tasteTagOrder(savedTrips);
  const orderedDestinations = tasteOrder.length > 0
    ? [...DESTINATIONS].sort((a, b) => {
        const rankA = tasteOrder.indexOf(a.tag);
        const rankB = tasteOrder.indexOf(b.tag);
        return (rankA === -1 ? 999 : rankA) - (rankB === -1 ? 999 : rankB);
      })
    : DESTINATIONS;
  const shownDestinations = orderedDestinations.slice(0, 6);

  return (
    <div className="px-4 pb-24 pt-1">
      {fetchError && (
        <div className="rounded-jz-card p-3.5 mb-3 mt-1 flex items-center justify-between gap-3" style={{ background: "rgba(196, 58, 47, 0.15)", color: C.hanko }}>
          <span className="text-xs leading-relaxed flex-1">{t("nav.tripsLoadError")}</span>
          <button onClick={fetchTrips} className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: C.hanko, color: "#fff" }}>
            {t("nav.retry")}
          </button>
        </div>
      )}
      <header className="flex items-center justify-between gap-3 py-3.5">
        <div>
          <div className="text-jz-label font-bold uppercase tracking-wider" style={{ color: C.green }}>
            {isNewUser ? t("home.welcome") : t("home.welcomeBack")}
          </div>
          {userName && (
            <h1 className="mt-0.5 text-jz-screen font-semibold" style={{ ...display, color: C.ink }}>{userName}</h1>
          )}
        </div>
        {userName && (
          <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full font-bold" style={{ background: C.greenSoft, color: C.green, border: `1px solid ${C.line}` }}>
            {userName[0]?.toUpperCase()}
          </div>
        )}
      </header>

      {isNewUser ? (
        <div className="rounded-jz-card border p-6 text-center" style={{ borderColor: C.line, background: `linear-gradient(165deg, ${C.greenSoft}, ${C.card} 62%)` }}>
          <div className="mb-2.5 text-4xl">🧭</div>
          <h2 className="text-[24px] font-semibold" style={{ ...display, color: C.ink }}>{t("home.whereToNext")}</h2>
          <p className="mx-auto mb-5 max-w-[280px] text-jz-body" style={{ color: C.sub }}>{t("home.whereToNextBody")}</p>
          <button onClick={onStartPlanning} className="min-h-[56px] rounded-jz-btn px-6 font-bold text-white" style={{ background: C.green }}>
            {t("nav.startPlanning")} →
          </button>
        </div>
      ) : (
        upcoming && (
          <button
            onClick={() => !isBroken(upcoming) && openTrip(upcoming)}
            className="relative flex min-h-[190px] w-full items-end overflow-hidden rounded-jz-card text-left shadow-lg"
            style={{ background: tripTile(upcoming.region).background }}
          >
            {heroPhotoRef && (
              <img
                src={`${API_BASE}/api/photo?reference=${heroPhotoRef}`}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(195deg, rgba(20,18,15,.12) 0%, rgba(20,18,15,.85) 100%)" }} />
            <div className="relative w-full p-[18px]" style={{ color: "#FBF6EC" }}>
              <span className="mb-2 inline-block rounded-full border px-2.5 py-1 text-[11px] font-bold" style={{ borderColor: "rgba(255,255,255,.3)", background: "rgba(255,255,255,.16)" }}>
                🗓️ {t("home.daysToGo").replace("{{n}}", String(Math.max(0, Math.ceil((new Date(upcoming.arrival_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))))}
              </span>
              <div className="text-[22px] font-semibold capitalize" style={{ ...display }}>{upcoming.region}</div>
              <div className="mt-0.5 text-jz-label opacity-90">
                {new Date(upcoming.arrival_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                {' – '}
                {new Date(upcoming.leave_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </div>
              <div className="mt-3 text-jz-label font-bold">{t("home.viewItinerary")}</div>
            </div>
          </button>
        )
      )}

      {!isNewUser && (
        <>
          <div className="my-5 flex items-center justify-between text-jz-label font-bold uppercase tracking-wider" style={{ color: C.sub }}>
            {t("home.yourTrips")}
            {hasMore && (
              <span onClick={(e) => { e.stopPropagation(); onSeeAllTrips(); }} className="cursor-pointer font-bold normal-case tracking-normal" style={{ color: C.green }}>
                {t("home.seeAll")}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2.5">
            {previewTrips.map((trip: any) => (
              <TripRow
                key={trip.id}
                trip={trip}
                onOpen={() => !isBroken(trip) && openTrip(trip)}
                onDelete={(e) => deleteTrip(trip, e)}
                loading={loadingTripId === trip.id}
                deleting={deletingTripId === trip.id}
                broken={isBroken(trip)}
              />
            ))}
          </div>
        </>
      )}

      <div className="my-5 text-jz-label font-bold uppercase tracking-wider" style={{ color: C.sub }}>
        {isNewUser ? t("home.needASpark") : t("home.planAnotherTrip")}
      </div>

      {isNewUser && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 jz-scroll">
          {VIBES.map((v) => (
            <button
              key={v.label}
              onClick={() => onSeedPlanning(`I'd love a ${v.label.toLowerCase()} trip`)}
              className="flex flex-none items-center gap-1.5 rounded-full border px-3.5 py-2 text-jz-body font-bold"
              style={{ borderColor: C.line, background: C.card, color: C.ink }}
            >
              {v.emoji} {v.label}
            </button>
          ))}
        </div>
      )}

      <div className={isNewUser ? "grid grid-cols-2 gap-2.5" : "flex gap-2.5 overflow-x-auto pb-1.5 jz-scroll"}>
        {shownDestinations.map((d) => (
          <button
            key={d.name}
            onClick={() => onSeedPlanning(`I want to plan a trip to ${d.name}`)}
            className={isNewUser
              ? "relative flex min-h-[150px] items-end overflow-hidden rounded-2xl text-left shadow"
              : "relative flex h-24 w-[118px] flex-none items-end overflow-hidden rounded-2xl text-left"}
            style={{ background: tripTile(d.name).background }}
          >
            <img
              src={`${API_BASE}/api/photo?reference=${d.photoRef}`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(200deg, rgba(20,18,15,.05) 30%, rgba(20,18,15,.85) 100%)" }} />
            <div className="relative p-2.5" style={{ color: "#FBF6EC" }}>
              {isNewUser ? (
                <>
                  <span className="mb-5 block text-2xl">{d.emoji}</span>
                  <div className="text-[15px] font-semibold leading-tight" style={{ ...display }}>{d.name}</div>
                </>
              ) : (
                <div className="text-jz-body font-bold">{d.emoji} {d.name}</div>
              )}
            </div>
          </button>
        ))}
      </div>

      {!isNewUser && (
        <button
          onClick={onStartPlanning}
          className="fixed bottom-24 right-5 flex h-[54px] w-[54px] items-center justify-center rounded-full shadow-lg"
          style={{ background: C.amber, color: "#3d2705" }}
          aria-label={t("nav.startPlanning")}
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
