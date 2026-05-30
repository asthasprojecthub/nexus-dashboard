const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const User = require('../models/User');
const Inquiry = require('../models/Inquiry');
const Project = require('../models/Project');
const Customer = require('../models/Customer');
const Notification = require('../models/Notification');
const Counter = require('../models/Counter');

const MONGO_URI = process.env.MONGODB_URI;

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    console.log('✅ Connected to MongoDB');

    // Drop Database
    await mongoose.connection.db.dropDatabase();

    console.log('🗑️ Database Dropped');

    // Reconnect
    await mongoose.disconnect();
    await mongoose.connect(MONGO_URI);

    console.log('🔄 Reconnected');

    // Initialize Counter
    await Counter.create({
      id: 'inquiryId',
      seq: 1349,
    });

    console.log('🔢 Counter Initialized');

    // USERS
    const users = await User.create([
      {
        name: 'Admin User',
        email: 'admin@electricalcrm.com',
        password: 'admin123',
        role: 'admin',
        phone: '9876543210',
      },

      {
        name: 'Rahul Manager',
        email: 'manager@electricalcrm.com',
        password: 'manager123',
        role: 'manager',
        phone: '9876543211',
      },

      {
        name: 'Amit Sales',
        email: 'amit@electricalcrm.com',
        password: 'sales123',
        role: 'salesperson',
        phone: '9876543212',
      },

      {
        name: 'Priya Sales',
        email: 'priya@electricalcrm.com',
        password: 'sales123',
        role: 'salesperson',
        phone: '9876543213',
      },
    ]);

    console.log(
      `👥 Created ${users.length} users`
    );

    const adminUser = users[0];
    const salesAmt = users[2];
    const salesPriya = users[3];

    // CUSTOMERS
    await Customer.create([
      {
        customerName: 'Rajesh Patel',
        companyName:
          'Patel Industries Pvt Ltd',
        contactPerson:
          'Rajesh Patel',
        email:
          'rajesh@patelindustries.com',
        mobileNumber:
          '9812345678',
        city: 'Ahmedabad',
        gstNumber:
          '24ABCDE1234F1Z5',
        totalProjects: 3,
        totalBusinessValue:
          2500000,
        createdBy:
          adminUser._id,
      },

      {
        customerName:
          'Suresh Kumar',
        companyName:
          'Kumar Textiles Ltd',
        contactPerson:
          'Suresh Kumar',
        email:
          'suresh@kumartextiles.com',
        mobileNumber:
          '9823456789',
        city: 'Surat',
        totalProjects: 1,
        totalBusinessValue:
          850000,
        createdBy:
          adminUser._id,
      },

      {
        customerName:
          'Meena Shah',
        companyName:
          'Shah Engineering Works',
        contactPerson:
          'Meena Shah',
        email:
          'meena@shahengg.com',
        mobileNumber:
          '9834567890',
        city: 'Vadodara',
        totalProjects: 2,
        totalBusinessValue:
          1750000,
        createdBy:
          adminUser._id,
      },

      {
        customerName:
          'Vivek Joshi',
        companyName:
          'Joshi Chemical Industries',
        contactPerson:
          'Vivek Joshi',
        email:
          'vivek@joshichem.com',
        mobileNumber:
          '9845678901',
        city: 'Rajkot',
        totalProjects: 0,
        totalBusinessValue: 0,
        createdBy:
          adminUser._id,
      },
    ]);

    console.log(
      '🏢 Created Customers'
    );

    // DATES
    const today = new Date();

    const nextWeek = new Date(
      today.getTime() +
        7 *
          24 *
          60 *
          60 *
          1000
    );

    const yesterday = new Date(
      today.getTime() -
        24 *
          60 *
          60 *
          1000
    );

    // INQUIRIES
    const inquiries =
      await Inquiry.create([
        {
          inquiryDate:
            new Date(
              '2024-01-10'
            ),

          customerName:
            'Rajesh Patel',

          companyName:
            'Patel Industries Pvt Ltd',

          contactPerson:
            'Rajesh Patel',

          mobileNumber:
            '9812345678',

          email:
            'rajesh@patelindustries.com',

          location:
            'Ahmedabad',

          productType: 'MCC',

          projectName:
            'New Factory MCC Panel',

          estimatedValue:
            850000,

          priority: 'High',

          status:
            'Order Recieved',

          convertedToProject: true,

          nextFollowUpDate:
            nextWeek,

          remarks:
            'Very interested customer',

          createdBy:
            adminUser._id,
        },

        {
          inquiryDate:
            new Date(
              '2024-01-15'
            ),

          customerName:
            'Suresh Kumar',

          companyName:
            'Kumar Textiles Ltd',

          contactPerson:
            'Suresh Kumar',

          mobileNumber:
            '9823456789',

          email:
            'suresh@kumartextiles.com',

          location: 'Surat',

          productType:
            'APFC',

          projectName:
            'APFC Panel',

          estimatedValue:
            450000,

          priority:
            'Medium',

          status:
            'Quotation Submit',

          nextFollowUpDate:
            nextWeek,

          remarks:
            'Quotation submitted',

          createdBy:
            adminUser._id,
        },

        {
          inquiryDate:
            new Date(
              '2024-02-01'
            ),

          customerName:
            'Meena Shah',

          companyName:
            'Shah Engineering Works',

          contactPerson:
            'Meena Shah',

          mobileNumber:
            '9834567890',

          email:
            'meena@shahengg.com',

          location:
            'Vadodara',

          productType: 'PCC',

          projectName:
            'Main PCC Panel',

          estimatedValue:
            1200000,

          priority: 'High',

          status:
            'Negotiation',

          nextFollowUpDate:
            yesterday,

          remarks:
            'Price negotiation ongoing',

          createdBy:
            adminUser._id,
        },

        {
          inquiryDate:
            new Date(
              '2024-02-10'
            ),

          customerName:
            'Vivek Joshi',

          companyName:
            'Joshi Chemical Industries',

          contactPerson:
            'Vivek Joshi',

          mobileNumber:
            '9845678901',

          email:
            'vivek@joshichem.com',

          location:
            'Rajkot',

          productType: 'VFD',

          projectName:
            'VFD Panel for Pumps',

          estimatedValue:
            320000,

          priority: 'Low',

          status: 'New',

          nextFollowUpDate:
            nextWeek,

          remarks:
            'Initial discussion pending',

          createdBy:
            adminUser._id,
        },

        {
          inquiryDate:
            new Date(
              '2024-01-20'
            ),

          customerName:
            'Harish Modi',

          companyName:
            'Modi Pharmaceuticals',

          contactPerson:
            'Harish Modi',

          mobileNumber:
            '9856789012',

          email:
            'harish@modipharma.com',

          location:
            'Gandhinagar',

          productType: 'PLC',

          projectName:
            'Automation PLC Panel',

          estimatedValue:
            950000,

          priority: 'High',

          status:
            'Inq. Lost',

          remarks:
            'Lost due to pricing',

          createdBy:
            adminUser._id,
        },
      ]);

    console.log(
      `📋 Created ${inquiries.length} inquiries`
    );

    // PROJECTS
    const projects =
      await Project.create([
        {},
      ]);

    console.log(
      `🏗️ Created ${projects.length} projects`
    );

    await Inquiry.findByIdAndUpdate(
      inquiries[0]._id,
      {
        projectReference:
          projects[0]._id,
      }
    );

    // NOTIFICATIONS
    await Notification.create([
      {
        title:
          'Follow-up Overdue',

        message:
          'Follow up',

        type: 'overdue',

        priority: 'High',

        isRead: false,

        recipient:
          salesAmt._id,

        relatedInquiry:
          inquiries[2]._id,
      },

      {
        title:
          'Order Recieved 🎉',

        message: `Inquiry ${inquiries[0].inquiryId} confirmed successfully`,

        type:
          'order_recieved',

        priority: 'High',

        isRead: true,

        recipient:
          adminUser._id,

        relatedInquiry:
          inquiries[0]._id,
      },
    ]);

    console.log(
      '🔔 Notifications Created'
    );

    console.log(
      '\n✅ Seed Data Created Successfully!\n'
    );

    process.exit(0);
  } catch (error) {
    console.error(
      '❌ Seed Error:',
      error.message
    );

    process.exit(1);
  }
};

seedData();