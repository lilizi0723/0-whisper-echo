/**
 * 腾讯云语音识别（录音文件识别），用于在国内环境生成逐字稿。
 * 需在 backend/.env 配置 TENCENT_SECRET_ID 与 TENCENT_SECRET_KEY。
 * 安装依赖：npm install tencentcloud-sdk-nodejs
 */
const ASR_SERVICE = "asr";
const ASR_VERSION = "2019-06-14";
const ASR_REGION = "ap-shanghai";

export type TencentAsrConfig = {
  secretId: string;
  secretKey: string;
};

/**
 * 通过音频 URL 提交识别任务并轮询结果，返回完整转写文本。
 * 文档：https://cloud.tencent.com/document/product/1093/37823
 */
export async function transcribeByUrl(audioUrl: string, config: TencentAsrConfig): Promise<string> {
  const mod = await import("tencentcloud-sdk-nodejs");
  const AsrClient = mod.tencentcloud.asr.v20190614.Client;
  const client = new AsrClient({
    credential: { secretId: config.secretId, secretKey: config.secretKey },
    region: ASR_REGION,
    profile: { httpProfile: { endpoint: "asr.tencentcloudapi.com" } }
  });

  const createRes = await client.CreateRecTask({
    SourceType: 1, // 1 = 音频 URL（文档里 0=URL 1=音频数据，以文档为准）
    Url: audioUrl,
    EngineModelType: "16k_zh",
    ChannelNum: 1,
    ResTextFormat: 2,
  } as any);

  const taskId = (createRes as any).Data?.TaskId;
  if (taskId == null) throw new Error("腾讯云 ASR 创建任务失败");

  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const desc = await client.DescribeTaskStatus({ TaskId: taskId } as any);
    const data = (desc as any).Data;
    const status = data?.TaskStatus;
    if (status === 2) {
      const result = data?.Result ?? "";
      const detail = data?.ResultDetail;
      if (detail && Array.isArray(detail)) {
        const text = detail.map((d: any) => d.FinalSentence ?? d.Text ?? "").filter(Boolean).join("\n");
        return text || result;
      }
      return typeof result === "string" ? result : JSON.stringify(result);
    }
    if (status === 3 || status === 4) throw new Error("腾讯云 ASR 识别失败");
  }
  throw new Error("腾讯云 ASR 识别超时");
}
