import fs from "fs";
import crypto from "crypto";
import { Request, Response } from "express";
import { UploadedFile } from "express-fileupload";
import { StatusCodes } from "http-status-codes";
import { VIDEO_MIME_TYPES } from "../../utils/constants";
import { runFFmpeg } from "./video.process";
import logger from "../../utils/logger";
import { deleteFiles } from "./video.service";
import { CompressVideoQuery } from "./video.schema";

export async function compressVideoHandler(
  req: Request<{}, {}, CompressVideoQuery>,
  res: Response
) {
  try {
    const video = req.files?.video as UploadedFile;
    const { width, height } = req.query;
    const tempFilePath = video?.tempFilePath;

    if (!video || !tempFilePath || !VIDEO_MIME_TYPES.includes(video.mimetype)) {
      await deleteFiles(tempFilePath);
      return res.status(StatusCodes.BAD_REQUEST).send("Invalid file type");
    }

    const fileType = video.mimetype.split("/")[1];

    const outputFilePath = `${process.cwd()}/temp/${crypto.randomUUID()}.${fileType}`;

    res.on("finish", async () => {
      await deleteFiles(tempFilePath, outputFilePath);
    });

    logger.info("Started compression");
    await runFFmpeg(
      tempFilePath,
      outputFilePath,
      width as string,
      height as string
    );

    res.status(StatusCodes.OK).sendFile(outputFilePath);
  } catch (error: any) {
    logger.error(error, `compressVideoHandler: error compression video failed`);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(error?.message || "");
  }
}
