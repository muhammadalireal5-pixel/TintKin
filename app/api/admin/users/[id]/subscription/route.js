import { verifyAdminSession } from "@/app/lib/admin-auth";
import { connectDb, User } from "@/app/lib/mongoose";

const ALLOWED_TIERS = ['free', 'pending', 'standard', 'premium'];

export async function PATCH(request, { params }) {
  const session = await verifyAdminSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { tier } = await request.json();
    if (!ALLOWED_TIERS.includes(tier)) {
      return Response.json({ error: "Invalid tier" }, { status: 400 });
    }

    await connectDb();

    const update = {
      tier: tier || 'free',
    };

    if (tier === 'standard' || tier === 'premium') {
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
  } catch (err) {
    console.error("[Admin Subscription Toggle]", err);
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
