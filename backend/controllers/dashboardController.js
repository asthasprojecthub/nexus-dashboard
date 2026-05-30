const Inquiry = require('../models/Inquiry');
const Project = require('../models/Project');
const Customer = require('../models/Customer');

// @desc Get dashboard stats
// @route GET /api/dashboard/stats
// @access Private
const getDashboardStats = async (
  req,
  res,
  next
) => {
  try {
    const now = new Date();

    const startOfMonth =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

    // =========================
    // INQUIRY COUNTS
    // =========================

    const [
      totalInquiries,
      newInquiries,
      quotationSubmit,
      wonProjects,
      lostProjects,
      completedProjects,
      totalProjects,
      totalCustomers,
    ] = await Promise.all([
      Inquiry.countDocuments(),

      Inquiry.countDocuments({
        status: 'New',
      }),

      Inquiry.countDocuments({
        status:
          'Quotation Submit',
      }),

      Inquiry.countDocuments({
        status:
          'Order Recieved',
      }),

      Inquiry.countDocuments({
        status: 'Inq. Lost',
      }),

      Project.countDocuments({
        projectStatus:
          'Completed',
      }),

      Project.countDocuments(),

      Customer.countDocuments(),
    ]);

    // =========================
    // ONGOING INQUIRIES
    // =========================

    const ongoingInquiries =
      await Inquiry.countDocuments(
        {
          status: {
            $in: [
              'Under Discussion',

              'Quotation Submit',

              'Negotiation',
            ],
          },
        }
      );

    // =========================
    // MONTHLY REVENUE
    // =========================

    const monthlyRevResult =
      await Project.aggregate([
        {
          $match: {
            projectStatus:
              'Completed',

            updatedAt: {
              $gte:
                startOfMonth,
            },
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum:
                '$orderValue',
            },
          },
        },
      ]);

    const monthlyRevenue =
      monthlyRevResult[0]
        ?.total || 0;

    // =========================
    // TOTAL REVENUE
    // =========================

    const totalRevResult =
      await Project.aggregate([
        {
          $match: {
            projectStatus:
              'Completed',
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum:
                '$orderValue',
            },
          },
        },
      ]);

    const totalRevenue =
      totalRevResult[0]
        ?.total || 0;

    // =========================
    // INQUIRY TREND
    // =========================

    const sixMonthsAgo =
      new Date();

    sixMonthsAgo.setMonth(
      sixMonthsAgo.getMonth() -
        5
    );

    sixMonthsAgo.setDate(1);

    const inquiryTrend =
      await Inquiry.aggregate([
        {
          $match: {
            createdAt: {
              $gte:
                sixMonthsAgo,
            },
          },
        },

        {
          $group: {
            _id: {
              year: {
                $year:
                  '$createdAt',
              },

              month: {
                $month:
                  '$createdAt',
              },
            },

            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            '_id.year': 1,
            '_id.month': 1,
          },
        },
      ]);

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const trendData =
      inquiryTrend.map(
        (item) => ({
          month:
            monthNames[
              item._id.month -
                1
            ],

          inquiries:
            item.count,
        })
      );

    // =========================
    // STATUS DISTRIBUTION
    // =========================

    const statusDist =
      await Inquiry.aggregate([
        {
          $group: {
            _id: '$status',

            count: {
              $sum: 1,
            },
          },
        },
      ]);

    // =========================
    // REVENUE TREND
    // =========================

    const revenueByMonth =
      await Project.aggregate([
        {
          $match: {
            createdAt: {
              $gte:
                sixMonthsAgo,
            },
          },
        },

        {
          $group: {
            _id: {
              year: {
                $year:
                  '$createdAt',
              },

              month: {
                $month:
                  '$createdAt',
              },
            },

            revenue: {
              $sum:
                '$orderValue',
            },
          },
        },

        {
          $sort: {
            '_id.year': 1,
            '_id.month': 1,
          },
        },
      ]);

    const revenueData =
      revenueByMonth.map(
        (item) => ({
          month:
            monthNames[
              item._id.month -
                1
            ],

          revenue:
            item.revenue,
        })
      );

    // =========================
    // SALES FUNNEL
    // =========================

    const funnelData = [
      {
        stage: 'New',
        count:
          newInquiries,
      },

      {
        stage:
          'Discussion',

        count:
          await Inquiry.countDocuments(
            {
              status:
                'Under Discussion',
            }
          ),
      },

      {
        stage:
          'Quotation',

        count:
          quotationSubmit,
      },

      {
        stage:
          'Negotiation',

        count:
          await Inquiry.countDocuments(
            {
              status:
                'Negotiation',
            }
          ),
      },

      {
        stage: 'Won',

        count:
          wonProjects,
      },
    ];

    // =========================
    // FOLLOWUPS
    // =========================

    const today =
      new Date();

    today.setHours(
      23,
      59,
      59,
      999
    );

    const pendingFollowUps =
      await Inquiry.countDocuments(
        {
          nextFollowUpDate:
            {
              $lte: today,
            },

          status: {
            $nin: [
              'Order Recieved',

              'Inq. Lost',
            ],
          },
        }
      );

    // =========================
    // RESPONSE
    // =========================

    res.json({
      success: true,

      data: {
        stats: {
          totalInquiries,

          newInquiries,

          ongoingInquiries,

          quotationSubmit,

          wonProjects,

          lostProjects,

          completedProjects,

          totalProjects,

          totalCustomers,

          monthlyRevenue,

          totalRevenue,

          pendingFollowUps,
        },

        charts: {
          inquiryTrend:
            trendData,

          statusDistribution:
            statusDist.map(
              (s) => ({
                name:
                  s._id,

                value:
                  s.count,
              })
            ),

          revenueByMonth:
            revenueData,

          salesFunnel:
            funnelData,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get recent activity
// @route GET /api/dashboard/recent
// @access Private
const getRecentActivity =
  async (
    req,
    res,
    next
  ) => {
    try {
      const recentInquiries =
        await Inquiry.find()

          .sort({
            createdAt: -1,
          })

          .limit(5)

          .select(
            'inquiryId customerName status priority createdAt'
          );

      const recentProjects =
        await Project.find()

          .sort({
            createdAt: -1,
          })

          .limit(5)

          .select(
            'projectId customerName projectName projectStatus createdAt'
          );

      res.json({
        success: true,

        data: {
          recentInquiries,

          recentProjects,
        },
      });
    } catch (error) {
      next(error);
    }
  };

module.exports = {
  getDashboardStats,
  getRecentActivity,
};