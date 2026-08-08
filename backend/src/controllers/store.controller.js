import prisma from '../config/db.js';

export const getReturnPolicy = async (req, res, next) => {
  try {
    const store = await prisma.storeSetting.findUnique({ where: { id: "default" } });
    res.json({ returnPolicy: store?.returnPolicy || "" });
  } catch (error) {
    next(error);
  }
};

export const updateReturnPolicy = async (req, res, next) => {
  const { returnPolicy } = req.body;
  try {
    const store = await prisma.storeSetting.upsert({
      where: { id: "default" },
      update: { returnPolicy },
      create: { id: "default", returnPolicy }
    });
    res.json({ success: true, message: "Return policy updated", returnPolicy: store.returnPolicy });
  } catch (error) {
    next(error);
  }
};

export const getPrivacyPolicy = async (req, res, next) => {
  try {
    const store = await prisma.storeSetting.findUnique({ where: { id: "default" } });
    res.json({ privacyPolicy: store?.privacyPolicy || "" });
  } catch (error) {
    next(error);
  }
};

export const updatePrivacyPolicy = async (req, res, next) => {
  const { privacyPolicy } = req.body;
  try {
    const store = await prisma.storeSetting.upsert({
      where: { id: "default" },
      update: { privacyPolicy },
      create: { id: "default", privacyPolicy }
    });
    res.json({ success: true, message: "Privacy policy updated", privacyPolicy: store.privacyPolicy });
  } catch (error) {
    next(error);
  }
};

export const getTermsConditions = async (req, res, next) => {
  try {
    const store = await prisma.storeSetting.findUnique({ where: { id: "default" } });
    res.json({ termsConditions: store?.termsConditions || "" });
  } catch (error) {
    next(error);
  }
};

export const updateTermsConditions = async (req, res, next) => {
  const { termsConditions } = req.body;
  try {
    const store = await prisma.storeSetting.upsert({
      where: { id: "default" },
      update: { termsConditions },
      create: { id: "default", termsConditions }
    });
    res.json({ success: true, message: "Terms and conditions updated", termsConditions: store.termsConditions });
  } catch (error) {
    next(error);
  }
};

export const getContactDetails = async (req, res, next) => {
  try {
    const store = await prisma.storeSetting.findUnique({ where: { id: "default" } });
    res.json({
      supportPhone: store?.supportPhone,
      supportEmail: store?.supportEmail,
      whatsappNumber: store?.whatsappNumber,
      gstNumber: store?.gstNumber,
      supportHours: store?.supportHours,
      businessName: store?.businessName,
      businessAddress: store?.businessAddress
    });
  } catch (error) {
    next(error);
  }
};

export const updateContactDetails = async (req, res, next) => {
  const { supportPhone, supportEmail, whatsappNumber, gstNumber, supportHours, businessName, businessAddress } = req.body;
  try {
    const store = await prisma.storeSetting.upsert({
      where: { id: "default" },
      update: { supportPhone, supportEmail, whatsappNumber, gstNumber, supportHours, businessName, businessAddress },
      create: { id: "default", supportPhone, supportEmail, whatsappNumber, gstNumber, supportHours, businessName, businessAddress }
    });
    res.json({ success: true, message: "Contact details updated" });
  } catch (error) {
    next(error);
  }
};
