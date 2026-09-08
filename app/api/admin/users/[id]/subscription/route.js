import { verifyAdminSession } from "@/app/lib/admin-auth";
import { connectDb, User } from "@/app/lib/mongoose";
import { TIERS, ALLOWED_ADMIN_TIERS, ACTIVE_SUBSCRIPTION_TIERS } from "@/lib/constants/tiers";
import mongoose from "mongoose";

export async function PATCH(request, { params }) {
  const session = await verifyAdminSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const body = await request.json();
    const tier = body?.tier;
    if (!ALLOWED_ADMIN_TIERS.includes(tier)) {
      return Response.json({ error: "Invalid tier" }, { status: 400 });
    }

    await connectDb();

    const update = {
      tier: tier || TIERS.FREE,
    };

    if (ACTIVE_SUBSCRIPTION_TIERS.includes(tier)) {
      update.isSubscribed = true;
      update.subscribedAt = new Date();
      update.currentPeriodStart = new Date();
    } else {
      update.isSubscribed = false;
      update.subscribedAt = null;
    }

    const user = await User.findByIdAndUpdate(id, update, { new: true });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      success: true,
      user: {
        _id: user._id.toString(),
        isSubscribed: user.isSubscribed,
        tier: user.tier,
        subscribedAt: user.subscribedAt,
      },
    });
  } catch {
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
