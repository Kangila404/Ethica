// Run from the repository root: swift ios/Tools/GenerateBrandAssets.swift
// A custom four-point star, shared by the icon and launch screen.
import AppKit

let root = URL(fileURLWithPath: "ios/Ethica/Resources/LoginAssets.xcassets")
let outline = CGMutablePath()
// Long vertical tips, shorter horizontal tips, and continuous concave curves.
outline.move(to: CGPoint(x: 0, y: 300))
outline.addCurve(to: CGPoint(x: 238, y: 0), control1: CGPoint(x: 34, y: 62), control2: CGPoint(x: 48, y: 30))
outline.addCurve(to: CGPoint(x: 0, y: -300), control1: CGPoint(x: 48, y: -30), control2: CGPoint(x: 34, y: -62))
outline.addCurve(to: CGPoint(x: -238, y: 0), control1: CGPoint(x: -34, y: -62), control2: CGPoint(x: -48, y: -30))
outline.addCurve(to: CGPoint(x: 0, y: 300), control1: CGPoint(x: -48, y: 30), control2: CGPoint(x: -34, y: 62))
outline.closeSubpath()
let bounds = outline.boundingBoxOfPath

func mark(_ context: CGContext, in rect: CGRect, color: CGColor) {
  context.saveGState()
  let scale = rect.height / bounds.height
  context.translateBy(x: rect.midX - bounds.midX * scale, y: rect.midY - bounds.midY * scale)
  context.scaleBy(x: scale, y: scale)
  context.setFillColor(color)
  context.addPath(outline)
  context.fillPath()
  context.restoreGState()
}
func png(_ name: String, dark: Bool) throws {
  let context = CGContext(data: nil, width: 1024, height: 1024, bitsPerComponent: 8,
    bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
  let colors = dark
    ? [NSColor(calibratedWhite: 0.13, alpha: 1).cgColor, NSColor(calibratedWhite: 0.055, alpha: 1).cgColor]
    : [NSColor(calibratedRed: 0.98, green: 0.97, blue: 0.94, alpha: 1).cgColor, NSColor(calibratedRed: 0.90, green: 0.89, blue: 0.85, alpha: 1).cgColor]
  let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors as CFArray, locations: [0,1])!
  context.drawLinearGradient(gradient, start: CGPoint(x: 200, y: 1024), end: CGPoint(x: 824, y: 0), options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
  mark(context, in: CGRect(x: 190, y: 230, width: 644, height: 564),
    color: dark ? NSColor(calibratedWhite: 0.94, alpha: 1).cgColor : NSColor(calibratedWhite: 0.09, alpha: 1).cgColor)
  let bitmap = NSBitmapImageRep(cgImage: context.makeImage()!)
  try bitmap.representation(using: .png, properties: [:])!.write(to: root.appendingPathComponent("AppIcon.appiconset/\(name).png"))
}
try png("AppIcon", dark: false)
try png("AppIconDark", dark: true)
let directory = root.appendingPathComponent("LaunchMark.imageset")
try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
var box = CGRect(x: 0, y: 0, width: 112, height: 112)
let consumer = CGDataConsumer(url: directory.appendingPathComponent("LaunchMark.pdf") as CFURL)!
let pdf = CGContext(consumer: consumer, mediaBox: &box, nil)!
pdf.beginPDFPage(nil)
mark(pdf, in: CGRect(x: 0, y: 13, width: 112, height: 86), color: NSColor(calibratedWhite: 0.94, alpha: 1).cgColor)
pdf.endPDFPage()
pdf.closePDF()
