import { verifyAdminSession } from "@/app/lib/admin-auth";
import { connectDb, User } from "@/app/lib/mongoose";

export async function PATCH(request, { params }) {
  const session = await verifyAdminSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { isSubscribed } = await request.json();

    await connectDb();

    const update = {
      isSubscribed: !!isSubscribed,
      subscribedAt: isSubscribed ? new Date() : null,
    };

    const user = await User.findByIdAndUpdate(id, update, { new: true });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      success: true,
      user: {
        _id: user._id.toString(),
        isSubscribed: user.isSubscribed,
        subscribedAt: user.subscribedAt,
      },
    });
  } catch (err) {
    console.error("[Admin Subscription Toggle]", err);
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
