import { prisma } from "@/lib/prisma";

export async function createServiceNotification(params: {
  serviceId: string;
  type: "NEW_SERVICE" | "UPDATED_SERVICE" | "DELETED_SERVICE";
  title: string;
  message: string;
}) {
  return prisma.notification.create({
    data: {
      serviceId: params.serviceId,
      type: params.type,
      title: params.title,
      message: params.message,
    },
  });
}
